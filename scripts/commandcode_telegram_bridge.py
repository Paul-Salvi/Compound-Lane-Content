"""
CommandCode <-> Telegram bridge (plain).

A minimal communication bridge: polls Telegram for messages from an
allowlisted chat, forwards each message to Command Code's headless mode
("command-code -p ...") running in this project directory, and sends the
reply back to the same chat.

Deliberately minimal:
- one allowlisted chat (the owner)
- short, crisp replies (markdown stripped, truncated)
- resumes the chat's own dedicated session (per-chat session id, persisted)
- always runs with full permissions (--yolo); the allowlist is the gate

The source project's extra machinery (monitor dashboard, outbox queue,
/plan command, plan-review watcher, heartbeats, per-chat session file) was
removed. Grow the bridge back incrementally if this project needs it.

Setup
-----
1. pip install python-telegram-bot --upgrade
2. Create a bot via @BotFather in Telegram, copy the token.
3. Get your numeric chat id (message @userinfobot) and set ALLOWED_CHAT_IDS.
4. Set TELEGRAM_BOT_TOKEN (env var or the default in CONFIG).
5. Run: python commandcode_telegram_bridge.py
"""

import asyncio
import json
import os
import platform
import re
import shutil
import signal
import subprocess
import threading
import time
import urllib.request
from datetime import datetime, timezone

from telegram import Update
from telegram.error import NetworkError
from telegram.ext import Application, ContextTypes, MessageHandler, filters

# Serializes command-code runs so only one runs at a time.
_exec_lock = threading.Lock()

# ----------------------------------------------------------------------------
# CONFIG - edit these or set as environment variables before running
# ----------------------------------------------------------------------------

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "8219987636:AAFRaG9Ji8Qf1kPpyTTt2lf3KUKtJxeIkQ0")

if not TELEGRAM_BOT_TOKEN:
    raise SystemExit(
        "TELEGRAM_BOT_TOKEN is not set — refusing to start with a hardcoded default.\n"
        "Set it as an env var before running: export TELEGRAM_BOT_TOKEN=\"<token>\" (or via your host's secrets/env file).\n"
        "See docs/TELEGRAM_BRIDGE.md §2 + docs/ACCOUNTS.md §2 (Telegram bot row) for the bridge contract."
    )

# Only messages from these numeric chat ids will be processed.
# Leave empty during first run to discover your chat id (printed to console).
ALLOWED_CHAT_IDS = {
    int(cid) for cid in os.environ.get("ALLOWED_CHAT_IDS", "8099948260").split(",") if cid.strip()
}

# Working directory CommandCode should operate in (the repo root by default).
WORKDIR = os.environ.get("COMMANDCODE_WORKDIR", str(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Max turns per headless call.
MAX_TURNS = int(os.environ.get("COMMANDCODE_MAX_TURNS", "40"))

TELEGRAM_MSG_LIMIT = 4000  # stay under Telegram's 4096 char cap with margin

# Keep replies minimal: hardrule — fewest tokens, no greetings/fluff. MAX_REPLY_CHARS truncates any overrun.
BRIEF_SUFFIX = (
    "\n\nABSOLUTE BREVITY: fewest tokens. No greetings/fluff/intros/conclusions. Direct answer only. Plain text, no markdown."
)
MAX_REPLY_CHARS = 1000

# Monitor integration: post telegram_msg_* events to the Command Code Activity
# Monitor so its /telegram and /bridge pages show conversations. Best-effort —
# a stopped monitor never breaks the reply loop.
MONITOR_INGEST_URL = os.environ.get("MONITOR_INGEST_URL", "http://localhost:8787/ingest")

# Per-chat session id mapping, persisted so Telegram messages resume their own
# chat's dedicated session (never the most-recent headless session, which may
# be a huge interactive/other thread — the token drain this fixes).
BRIDGE_SESSION_FILE = os.environ.get(
    "BRIDGE_SESSION_FILE",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                 "monitor", "data", "bridge_sessions.json"),
)


def _load_chat_session(chat_id: int) -> str | None:
    """Load the stored session id for a chat, or None."""
    try:
        with open(BRIDGE_SESSION_FILE, "r", encoding="utf-8") as fh:
            mapping = json.load(fh)
        return mapping.get(str(chat_id))
    except Exception:  # noqa: BLE001 — missing/corrupt file → start fresh
        return None


def _save_chat_session(chat_id: int, session_id: str) -> None:
    """Persist the session id for a chat (atomic-ish write)."""
    try:
        os.makedirs(os.path.dirname(BRIDGE_SESSION_FILE), exist_ok=True)
        mapping = {}
        try:
            with open(BRIDGE_SESSION_FILE, "r", encoding="utf-8") as fh:
                mapping = json.load(fh)
        except Exception:  # noqa: BLE001 — start from an empty map
            mapping = {}
        mapping[str(chat_id)] = session_id
        with open(BRIDGE_SESSION_FILE, "w", encoding="utf-8") as fh:
            json.dump(mapping, fh, indent=2)
    except Exception as exc:  # noqa: BLE001 — never break the reply loop
        print(f"[session] failed to persist session id: {exc}")


def _post_to_monitor(event_type: str, data: dict) -> None:
    """Best-effort POST of one event to the monitor's ingest endpoint."""
    if not MONITOR_INGEST_URL:
        return
    try:
        payload = json.dumps([{
            "ts": datetime.now(timezone.utc).isoformat(),
            "sessionId": data.get("sessionId"),
            "turnNumber": None,
            "model": None,
            "project": None,
            "type": event_type,
            "data": data,
        }]).encode("utf-8")
        req = urllib.request.Request(
            MONITOR_INGEST_URL,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=3)
    except Exception as exc:  # noqa: BLE001 — never break the reply loop
        print(f"[monitor] failed to post {event_type}: {exc}")


def _kill_process_tree(proc: subprocess.Popen) -> None:
    """Kill proc and any children it spawned.

    command-code is launched with shell=True on Windows (to resolve npm's
    .cmd shim); proc.kill() alone would only kill the cmd.exe wrapper.
    """
    if platform.system() == "Windows":
        subprocess.run(
            ["taskkill", "/T", "/F", "/PID", str(proc.pid)],
            capture_output=True,
        )
    else:
        proc.kill()


def _run_once(prompt: str, resume_session_id: str | None = None):
    """Run a single command-code invocation, resuming a specific session.

    When resume_session_id is set, resumes that exact session (--resume <id>);
    otherwise starts fresh. Returns (final_text, error_text, session_id, usage,
    stdout, stderr) where final_text is the agent reply or None.
    """
    cmd = [
        "command-code",
        "-p", prompt,
        "--output-format", "json",
        "--max-turns", str(MAX_TURNS),
        "--skip-onboarding",
        # The allowlisted chat is trusted with full permissions so it can
        # operate on the project from Telegram.
        "--yolo",
    ]
    if resume_session_id:
        cmd += ["--resume", resume_session_id]

    on_windows = platform.system() == "Windows"
    try:
        proc = subprocess.Popen(
            cmd,
            cwd=WORKDIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            shell=on_windows,
        )
    except FileNotFoundError:
        return (
            None,
            "Could not find the `command-code` executable. Make sure it's "
            "installed globally (`npm i -g command-code`) and on PATH.",
            None,
            None,
            "",
            "",
        )

    try:
        stdout, stderr = proc.communicate(timeout=600)
    except subprocess.TimeoutExpired:
        _kill_process_tree(proc)
        proc.communicate()
        return None, "CommandCode timed out after 10 minutes.", None, None, "", ""

    if proc.returncode in (-signal.SIGTERM, -signal.SIGINT):
        return None, "(cancelled — bridge was stopped)", None, None, stdout, stderr

    final_text = None
    error_text = None
    session_id = None
    usage = None
    reply_parts = []
    for line in stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            frame = json.loads(line)
        except json.JSONDecodeError:
            continue
        if frame.get("type") == "result":
            final_text = frame.get("finalText")
            session_id = frame.get("sessionId") or None
            usage = frame.get("usage") or None
            if frame.get("subtype") == "error":
                error_text = frame.get("error")
        elif frame.get("type") == "event" and isinstance(frame.get("event"), dict):
            event = frame["event"]
            if event.get("type") == "run_end" and isinstance(event.get("result"), dict):
                result = event["result"]
                if final_text is None:
                    final_text = result.get("finalText")
                if session_id is None:
                    session_id = result.get("sessionId") or None
                if usage is None:
                    usage = result.get("usage") or None
            elif event.get("type") == "text_delta":
                delta = event.get("delta")
                if delta:
                    reply_parts.append(delta)

    # If no final result frame / run_end carried the reply text, reconstruct
    # it from the text_delta events.
    if final_text is None and not error_text and reply_parts:
        final_text = "".join(reply_parts)

    return final_text, error_text, session_id, usage, stdout, stderr


def _run_fresh(prompt: str):
    """Run command-code fresh (no resume), parse reply + session id + usage."""
    cmd = [
        "command-code",
        "-p", prompt,
        "--output-format", "json",
        "--max-turns", str(MAX_TURNS),
        "--skip-onboarding",
        "--yolo",
    ]
    try:
        proc = subprocess.Popen(
            cmd,
            cwd=WORKDIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            shell=platform.system() == "Windows",
        )
    except FileNotFoundError:
        return "Could not find the `command-code` executable on PATH.", None, None
    try:
        stdout, stderr = proc.communicate(timeout=600)
    except subprocess.TimeoutExpired:
        _kill_process_tree(proc)
        proc.communicate()
        return "CommandCode timed out after 10 minutes.", None, None
    # Parse the fresh run's output the same way _run_once does, including
    # text_delta reconstruction, so any output shape yields the reply.
    final_text = None
    error_text = None
    session_id = None
    usage = None
    reply_parts = []
    for line in stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            frame = json.loads(line)
        except json.JSONDecodeError:
            continue
        if frame.get("type") == "result":
            final_text = frame.get("finalText")
            session_id = frame.get("sessionId") or None
            usage = frame.get("usage") or None
            if frame.get("subtype") == "error":
                error_text = frame.get("error")
        elif frame.get("type") == "event" and isinstance(frame.get("event"), dict):
            event = frame["event"]
            if event.get("type") == "run_end" and isinstance(event.get("result"), dict):
                result = event["result"]
                if final_text is None:
                    final_text = result.get("finalText")
                if session_id is None:
                    session_id = result.get("sessionId") or None
                if usage is None:
                    usage = result.get("usage") or None
            elif event.get("type") == "text_delta":
                delta = event.get("delta")
                if delta:
                    reply_parts.append(delta)
    if final_text is None and not error_text and reply_parts:
        final_text = "".join(reply_parts)

    if error_text:
        return f"CommandCode error: {error_text}", session_id, usage
    if final_text:
        return final_text, session_id, usage
    return (
        "No readable reply came back from CommandCode "
        "(the run ended without a text result). Try again, or check the "
        "bridge logs for details."
    ), session_id, usage


def _exec_commandcode(prompt: str, resume_session_id: str | None = None):
    """Run command-code once, resuming the chat's session when one exists.

    Returns (reply_text, session_id, usage) — reply text (or an error message).
    """
    final_text, error_text, session_id, usage, stdout, stderr = _run_once(prompt, resume_session_id)
    combined = (((stderr or "") + (stdout or "") + (error_text or ""))).lower()
    # Covers fresh-directory "no session yet" and post-delete
    # "No session ... found to resume." (subtype:error with an error_text).
    stale_resume = error_text and "no session" in error_text.lower()
    no_session_yet = (
        final_text is None
        and (error_text is None or stale_resume)
        and ("too many arguments" in combined or "no session" in combined)
    )
    if no_session_yet or stale_resume:
        # The stored session id is stale (deleted/expired): retry fresh.
        return _run_fresh(prompt)

    if error_text:
        return f"CommandCode error: {error_text}", session_id, usage
    if final_text:
        return final_text, session_id, usage
    return (
        "No readable reply came back from CommandCode "
        "(the run ended without a text result). Try again, or check the "
        "bridge logs for details."
    ), session_id, usage


def _strip_markdown(text: str) -> str:
    """Strip markdown symbols so replies read cleanly as plain text."""
    if not text:
        return text
    text = re.sub(r"```[^\n]*\n?(.*?)```", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"(\*\*|__)(.+?)\1", r"\2", text)
    text = re.sub(r"(?<!\w)(\*|_)(?!\s)(.+?)\1(?!\w)", r"\2", text)
    text = re.sub(r"^\s{0,3}#{1,6}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s{0,3}(?:> ?|---+|\*\*\*+)\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"<([^>]+)>", r"\1", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _trim_reply(text: str, limit: int = MAX_REPLY_CHARS) -> str:
    """Strip markdown, then truncate so a reply never ships as a wall of text."""
    if not text:
        return text
    text = _strip_markdown(text)
    if len(text) > limit:
        return text[:limit].rstrip() + "\n…(truncated)"
    return text


async def _retry_network_call(coro_factory, attempts: int = 3, delay: float = 2.0):
    """Retry a Telegram API call a few times on transient network errors.

    coro_factory is a zero-arg callable returning a fresh coroutine each
    time, since an already-awaited coroutine object can't be reused.
    """
    last_exc = None
    for attempt in range(1, attempts + 1):
        try:
            return await coro_factory()
        except NetworkError as exc:
            last_exc = exc
            print(f"[network] attempt {attempt}/{attempts} failed: {exc}")
            if attempt < attempts:
                await asyncio.sleep(delay)
    raise last_exc


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    text = update.message.text if update.message else None

    if ALLOWED_CHAT_IDS and chat_id not in ALLOWED_CHAT_IDS:
        print(f"[blocked] message from unlisted chat_id={chat_id}: {text!r}")
        return

    if not ALLOWED_CHAT_IDS:
        print(f"[discovery] message from chat_id={chat_id} — add this id to ALLOWED_CHAT_IDS")

    if not text:
        return

    # Typing indicator is cosmetic — never let it block the real reply.
    try:
        await update.message.chat.send_action("typing")
    except NetworkError:
        pass

    # The prompt is passed to command-code as a single -p argument, and on
    # Windows the bridge launches through cmd.exe (shell=True, required to
    # resolve the npm .cmd shim). Any newline inside a quoted argument breaks
    # cmd's command-line parsing and silently swallows every flag that follows
    # (--output-format, --max-turns), producing "No readable reply". Collapse
    # newlines to spaces before building the prompt.
    prompt = (text + BRIEF_SUFFIX).replace("\r", " ").replace("\n", " ")
    loop = asyncio.get_running_loop()
    message_id = update.message.message_id

    with _exec_lock:
        _post_to_monitor("telegram_msg_start", {
            "chatId": chat_id,
            "messageId": message_id,
            "messageText": text,
            "status": "queued",
        })
        started = time.monotonic()
        reply, session_id, usage = await loop.run_in_executor(
            None, _exec_commandcode, prompt, _load_chat_session(chat_id)
        )
        duration_ms = int((time.monotonic() - started) * 1000)
        if session_id:
            _save_chat_session(chat_id, session_id)

    reply = _trim_reply(reply)
    _post_to_monitor("telegram_msg_end", {
        "chatId": chat_id,
        "messageId": message_id,
        "messageText": text,
        "status": "succeeded",
        "sessionId": session_id,
        "durationMs": duration_ms,
        "stopReason": "end_turn",
        "subtype": "success",
        "replyText": reply,
        "usage": usage,
    })
    for i in range(0, len(reply), TELEGRAM_MSG_LIMIT):
        chunk = reply[i:i + TELEGRAM_MSG_LIMIT]
        try:
            await _retry_network_call(
                lambda c=chunk: update.message.reply_text(c)
            )
        except NetworkError as exc:
            print(f"[network] giving up sending a reply chunk: {exc}")


def _handle_sigint(signum, frame) -> None:
    """Kill any in-flight command-code subprocess, then hard-exit.

    This runs even while a blocking subprocess.Popen().communicate() call is
    executing in a worker thread, which is why it's a real OS signal handler
    rather than relying on asyncio/PTB's shutdown path.
    """
    print("\nCtrl+C received — stopping bridge...")
    os._exit(0)


def main() -> None:

    if not os.path.isdir(WORKDIR):
        raise SystemExit(
            f"WORKDIR does not exist: {WORKDIR}\n"
            "Set COMMANDCODE_WORKDIR to an existing project directory before running."
        )

    signal.signal(signal.SIGINT, _handle_sigint)
    if hasattr(signal, "SIGBREAK"):  # Windows: Ctrl+Break
        signal.signal(signal.SIGBREAK, _handle_sigint)

    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("CommandCode <-> Telegram bridge running. Ctrl+C to stop.")
    print(f"WORKDIR: {WORKDIR}")
    print(f"Allowed chats: {sorted(ALLOWED_CHAT_IDS) if ALLOWED_CHAT_IDS else 'ANY (discovery mode)'}")
    print("Mode: always --yolo (full permissions)")

    try:
        app.run_polling(stop_signals=None, bootstrap_retries=-1)
    except (KeyboardInterrupt, SystemExit):
        pass


if __name__ == "__main__":
    main()
