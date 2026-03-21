# Terminal Usage Guide

This project's environment (Windows CMD / Antigravity) has a known bug where "simple" or "short" terminal commands (like `dir` or `whoami`) may hang or fail with quoting errors.

## The Bug
When calling `run_command` with a single-word command, the system may incorrectly interpret it (e.g., `dir` becomes `dir"`). This is a platform-level issue.

## The Fix
To ensure commands execute successfully:

1. **Always use `cmd /c`**: Explicitly invoke the command processor.
2. **Add an argument**: Even if the command doesn't need one, add a `.` or a space. e.g., `cmd /c dir .` instead of `dir`.
3. **Use the helper script**: You can run `terminal_fix.bat <command>` for a robust execution.

**Example for Agents:**
Bad: `run_command(CommandLine="dir")`
Good: `run_command(CommandLine="cmd /c dir .")` or `run_command(CommandLine="terminal_fix.bat dir")`
