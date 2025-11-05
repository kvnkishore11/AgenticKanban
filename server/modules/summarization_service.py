"""
Summarization Service Module

Generates AI summaries for file changes and workflow events using Claude Haiku.
Supports both Anthropic and OpenAI SDK with fire-and-forget async execution.
"""

import os
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class SummarizationService:
    """
    AI summarization service for file changes and events.

    This service uses Claude Haiku (or GPT-3.5-turbo as fallback) to generate
    concise human-readable summaries for:
    - File changes (from git diffs)
    - Tool use operations
    - Session execution

    Summaries are generated asynchronously (fire-and-forget) to avoid blocking
    workflow execution.

    Attributes:
        model: AI model to use for summarization
        max_tokens: Maximum tokens per summary
        _cache: Cache of generated summaries
        _client: AI SDK client (Anthropic or OpenAI)
        _provider: Provider type ('anthropic' or 'openai')
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        provider: Optional[str] = None
    ):
        """
        Initialize SummarizationService.

        Args:
            api_key: API key for AI service (defaults to env variable)
            model: Model to use (defaults to claude-3-haiku or gpt-3.5-turbo)
            provider: Provider to use ('anthropic' or 'openai', auto-detect if None)
        """
        self._cache: Dict[str, str] = {}
        self._client = None
        self._provider = provider

        # Determine provider and setup client
        self._setup_client(api_key, model)

        logger.info(
            f"SummarizationService initialized with provider={self._provider}, "
            f"model={self.model}"
        )

    def _setup_client(self, api_key: Optional[str], model: Optional[str]):
        """Setup AI client based on available API keys and provider preference"""

        # Try Anthropic first (preferred)
        if self._provider in [None, 'anthropic']:
            try:
                from anthropic import Anthropic

                anthropic_key = api_key or os.getenv("ANTHROPIC_API_KEY")
                if anthropic_key:
                    self._client = Anthropic(api_key=anthropic_key)
                    self._provider = 'anthropic'
                    self.model = model or os.getenv(
                        "SUMMARIZATION_MODEL",
                        "claude-3-haiku-20240307"
                    )
                    self.max_tokens = 100
                    logger.info("Using Anthropic SDK")
                    return
            except ImportError:
                logger.debug("Anthropic SDK not available")

        # Try OpenAI as fallback
        if self._provider in [None, 'openai']:
            try:
                from openai import OpenAI

                openai_key = api_key or os.getenv("OPENAI_API_KEY")
                if openai_key:
                    self._client = OpenAI(api_key=openai_key)
                    self._provider = 'openai'
                    self.model = model or os.getenv(
                        "SUMMARIZATION_MODEL",
                        "gpt-3.5-turbo"
                    )
                    self.max_tokens = 100
                    logger.info("Using OpenAI SDK")
                    return
            except ImportError:
                logger.debug("OpenAI SDK not available")

        # No client available
        logger.warning(
            "No AI SDK available. Install 'anthropic' or 'openai' package. "
            "Summarization will use fallback mode."
        )
        self._client = None
        self._provider = 'fallback'
        self.model = 'fallback'
        self.max_tokens = 0

    def summarize_file_change(
        self,
        file_path: str,
        diff: str,
        operation: str
    ) -> str:
        """
        Generate concise summary of file change (<200 chars).

        Args:
            file_path: Path to the modified file
            diff: Git diff of the changes
            operation: Operation type ('modified', 'created', 'deleted')

        Returns:
            Human-readable summary of the change
        """
        # Check cache
        cache_key = f"file:{file_path}:{hash(diff)}"
        if cache_key in self._cache:
            logger.debug(f"Returning cached summary for {file_path}")
            return self._cache[cache_key]

        # Fallback mode
        if not self._client:
            summary = self._fallback_file_summary(file_path, operation)
            self._cache[cache_key] = summary
            return summary

        # Generate AI summary
        try:
            # Truncate diff for cost savings
            truncated_diff = diff[:1000] if diff else ""

            prompt = f"""Summarize this code change in 1-2 sentences (max 200 chars):

File: {file_path}
Operation: {operation}

Diff:
{truncated_diff}

Focus on WHAT changed and WHY (if apparent), not implementation details.
Be concise and specific."""

            if self._provider == 'anthropic':
                summary = self._summarize_with_anthropic(prompt)
            elif self._provider == 'openai':
                summary = self._summarize_with_openai(prompt)
            else:
                summary = self._fallback_file_summary(file_path, operation)

            # Cache result
            self._cache[cache_key] = summary

            logger.debug(f"Generated summary for {file_path}: {summary}")
            return summary

        except Exception as e:
            logger.error(f"Error generating summary for {file_path}: {str(e)}")
            # Fallback to generic summary
            summary = self._fallback_file_summary(file_path, operation)
            self._cache[cache_key] = summary
            return summary

    def summarize_tool_use(
        self,
        tool_name: str,
        input_data: dict,
        output_data: Any
    ) -> str:
        """
        Generate concise summary of tool use (<200 chars).

        Args:
            tool_name: Name of the tool
            input_data: Tool input parameters
            output_data: Tool output/result

        Returns:
            Human-readable summary of the tool use
        """
        # Check cache
        cache_key = f"tool:{tool_name}:{hash(str(input_data))}"
        if cache_key in self._cache:
            logger.debug(f"Returning cached summary for {tool_name}")
            return self._cache[cache_key]

        # Fallback mode
        if not self._client:
            summary = self._fallback_tool_summary(tool_name, input_data)
            self._cache[cache_key] = summary
            return summary

        # Generate AI summary
        try:
            # Truncate output for cost savings
            output_str = str(output_data)[:500] if output_data else "N/A"

            prompt = f"""Summarize this tool execution in 1 sentence (max 200 chars):

Tool: {tool_name}
Input: {input_data}
Output: {output_str}

Focus on the purpose and outcome, not technical details."""

            if self._provider == 'anthropic':
                summary = self._summarize_with_anthropic(prompt)
            elif self._provider == 'openai':
                summary = self._summarize_with_openai(prompt)
            else:
                summary = self._fallback_tool_summary(tool_name, input_data)

            # Cache result
            self._cache[cache_key] = summary

            logger.debug(f"Generated summary for {tool_name}: {summary}")
            return summary

        except Exception as e:
            logger.error(f"Error generating summary for {tool_name}: {str(e)}")
            summary = self._fallback_tool_summary(tool_name, input_data)
            self._cache[cache_key] = summary
            return summary

    def summarize_session(
        self,
        file_changes: Dict[str, Any],
        tool_uses: list,
        duration_seconds: int
    ) -> str:
        """
        Generate comprehensive session summary.

        Args:
            file_changes: Dictionary with read/modified file lists
            tool_uses: List of tool use events
            duration_seconds: Session duration

        Returns:
            Human-readable session summary
        """
        # Fallback mode
        if not self._client:
            return self._fallback_session_summary(file_changes, tool_uses, duration_seconds)

        # Generate AI summary
        try:
            files_read = len(file_changes.get("read", []))
            files_modified = len(file_changes.get("modified", []))
            tool_count = len(tool_uses)

            prompt = f"""Summarize this workflow execution in 2-3 sentences:

Duration: {duration_seconds}s
Files read: {files_read}
Files modified: {files_modified}
Tools used: {tool_count}

Modified files: {file_changes.get("modified", [])[:5]}

Describe what was accomplished in this workflow."""

            if self._provider == 'anthropic':
                summary = self._summarize_with_anthropic(prompt, max_tokens=150)
            elif self._provider == 'openai':
                summary = self._summarize_with_openai(prompt, max_tokens=150)
            else:
                summary = self._fallback_session_summary(file_changes, tool_uses, duration_seconds)

            logger.debug(f"Generated session summary: {summary}")
            return summary

        except Exception as e:
            logger.error(f"Error generating session summary: {str(e)}")
            return self._fallback_session_summary(file_changes, tool_uses, duration_seconds)

    async def async_summarize_file_change(
        self,
        file_path: str,
        diff: str,
        operation: str,
        adw_id: str,
        ws_manager,
        related_file: Optional[str] = None
    ):
        """
        Fire-and-forget async file change summarization with WebSocket broadcast.

        Args:
            file_path: Path to the modified file
            diff: Git diff of the changes
            operation: Operation type
            adw_id: Workflow execution ID
            ws_manager: WebSocketManager instance for broadcasting
            related_file: Related file path for broadcast
        """
        async def _summarize_and_broadcast():
            try:
                # Run summarization in thread pool to avoid blocking
                summary = await asyncio.to_thread(
                    self.summarize_file_change,
                    file_path,
                    diff,
                    operation
                )

                # Broadcast summary update
                await ws_manager.broadcast_summary_update(
                    adw_id=adw_id,
                    summary_type="file_change",
                    content=summary,
                    related_file=related_file or file_path
                )

                logger.debug(f"Broadcasted summary for {file_path}")

            except Exception as e:
                logger.error(f"Error in async summarization: {str(e)}")

        # Create task without awaiting
        asyncio.create_task(_summarize_and_broadcast())

    def _summarize_with_anthropic(self, prompt: str, max_tokens: Optional[int] = None) -> str:
        """Generate summary using Anthropic SDK"""
        response = self._client.messages.create(
            model=self.model,
            max_tokens=max_tokens or self.max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text.strip()

    def _summarize_with_openai(self, prompt: str, max_tokens: Optional[int] = None) -> str:
        """Generate summary using OpenAI SDK"""
        response = self._client.chat.completions.create(
            model=self.model,
            max_tokens=max_tokens or self.max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content.strip()

    def _fallback_file_summary(self, file_path: str, operation: str) -> str:
        """Generate fallback summary when AI is unavailable"""
        filename = os.path.basename(file_path)
        return f"{operation.capitalize()} {filename}"

    def _fallback_tool_summary(self, tool_name: str, input_data: dict) -> str:
        """Generate fallback summary for tool use"""
        if tool_name == "Read":
            file_path = input_data.get("file_path", "file")
            return f"Read {os.path.basename(file_path)}"
        elif tool_name == "Write":
            file_path = input_data.get("file_path", "file")
            return f"Created {os.path.basename(file_path)}"
        elif tool_name == "Edit":
            file_path = input_data.get("file_path", "file")
            return f"Edited {os.path.basename(file_path)}"
        else:
            return f"Executed {tool_name}"

    def _fallback_session_summary(
        self,
        file_changes: Dict[str, Any],
        tool_uses: list,
        duration_seconds: int
    ) -> str:
        """Generate fallback session summary"""
        files_read = len(file_changes.get("read", []))
        files_modified = len(file_changes.get("modified", []))

        parts = []
        if files_modified > 0:
            parts.append(f"Modified {files_modified} file(s)")
        if files_read > 0:
            parts.append(f"read {files_read} file(s)")

        if parts:
            summary = ", ".join(parts)
        else:
            summary = "Workflow completed"

        summary += f" in {duration_seconds}s"
        return summary

    def clear_cache(self):
        """Clear the summary cache"""
        self._cache.clear()
        logger.info("Cleared summary cache")

    def get_cache_size(self) -> int:
        """Get the number of cached summaries"""
        return len(self._cache)

    def get_provider(self) -> str:
        """Get the current AI provider"""
        return self._provider
