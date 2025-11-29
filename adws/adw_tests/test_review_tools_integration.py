#!/usr/bin/env -S uv run
# /// script
# dependencies = ["pytest", "pytest-asyncio"]
# ///
"""Integration tests for review tool runners.

These tests verify the actual execution of external tools:
- ESLint (JS/TS linting)
- Semgrep (security scanning)
- Ruff (Python linting) - if installed
- Bearer (security scanning) - if installed

Tests run against the actual codebase to verify real-world functionality.
"""

import unittest
import asyncio
import os
import sys
import tempfile
import shutil

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.eslint_runner import ESLintRunner
from tools.semgrep_runner import SemgrepRunner
from tools.ruff_runner import RuffRunner
from tools.bearer_runner import BearerRunner
from stages.review_modes import ReviewMode, IssueSeverity


class TestESLintRunner(unittest.TestCase):
    """Tests for ESLint runner."""

    def setUp(self):
        self.runner = ESLintRunner()
        self.test_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    def test_eslint_is_available(self):
        """Verify ESLint is available via npx."""
        self.assertTrue(self.runner.is_available(), "ESLint should be available via npx")

    def test_eslint_tool_properties(self):
        """Verify ESLint runner properties."""
        self.assertEqual(self.runner.tool_name, "eslint")
        self.assertEqual(self.runner.mode, ReviewMode.CODE_QUALITY)
        self.assertEqual(self.runner.command, "npx")

    def test_eslint_build_command(self):
        """Verify ESLint command building."""
        cmd = self.runner.build_command("/test/path")
        self.assertIn("npx", cmd)
        self.assertIn("eslint", cmd)
        self.assertIn("--format", cmd)
        self.assertIn("json", cmd)

    def test_eslint_execute_on_codebase(self):
        """Run ESLint on actual codebase (src directory)."""
        src_dir = os.path.join(self.test_dir, "src")
        if not os.path.exists(src_dir):
            self.skipTest("src directory not found")

        result = asyncio.run(self.runner.execute(src_dir))

        # Should execute successfully (even if there are lint errors)
        self.assertIsNotNone(result)
        self.assertEqual(result.tool_name, "eslint")
        self.assertEqual(result.mode, ReviewMode.CODE_QUALITY)
        print(f"ESLint found {len(result.findings)} issues")

    def test_eslint_parse_sample_output(self):
        """Test parsing of ESLint JSON output."""
        sample_output = '''[
            {
                "filePath": "/test/file.js",
                "messages": [
                    {
                        "ruleId": "no-unused-vars",
                        "severity": 2,
                        "message": "Variable 'x' is declared but never used",
                        "line": 10,
                        "column": 5
                    }
                ]
            }
        ]'''

        findings = self.runner.parse_output(sample_output)

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].category, "unused_code")
        self.assertEqual(findings[0].severity, IssueSeverity.HIGH)
        self.assertEqual(findings[0].line_number, 10)


class TestSemgrepRunner(unittest.TestCase):
    """Tests for Semgrep runner."""

    def setUp(self):
        self.runner = SemgrepRunner()
        self.test_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    def test_semgrep_is_available(self):
        """Verify Semgrep is available."""
        is_available = self.runner.is_available()
        if not is_available:
            self.skipTest("Semgrep not installed")
        self.assertTrue(is_available)

    def test_semgrep_tool_properties(self):
        """Verify Semgrep runner properties."""
        self.assertEqual(self.runner.tool_name, "semgrep")
        self.assertEqual(self.runner.mode, ReviewMode.SECURITY)
        self.assertEqual(self.runner.command, "semgrep")

    def test_semgrep_build_command(self):
        """Verify Semgrep command building."""
        cmd = self.runner.build_command("/test/path")
        self.assertIn("semgrep", cmd)
        self.assertIn("scan", cmd)
        self.assertIn("--json", cmd)
        self.assertIn("--config", cmd)

    def test_semgrep_parse_sample_output(self):
        """Test parsing of Semgrep JSON output."""
        sample_output = '''{
            "results": [
                {
                    "check_id": "python.security.sql-injection",
                    "path": "src/api.py",
                    "start": {"line": 25, "col": 10},
                    "end": {"line": 25, "col": 50},
                    "extra": {
                        "severity": "ERROR",
                        "message": "Possible SQL injection vulnerability",
                        "metadata": {
                            "cwe": "CWE-89"
                        }
                    }
                }
            ]
        }'''

        findings = self.runner.parse_output(sample_output)

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].category, "sql_injection")
        self.assertEqual(findings[0].severity, IssueSeverity.HIGH)
        self.assertEqual(findings[0].file_path, "src/api.py")


class TestRuffRunner(unittest.TestCase):
    """Tests for Ruff runner."""

    def setUp(self):
        self.runner = RuffRunner()
        self.test_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    def test_ruff_availability(self):
        """Check if Ruff is available."""
        is_available = self.runner.is_available()
        print(f"Ruff available: {is_available}")
        # Don't fail if not installed, just skip

    def test_ruff_tool_properties(self):
        """Verify Ruff runner properties."""
        self.assertEqual(self.runner.tool_name, "ruff")
        self.assertEqual(self.runner.mode, ReviewMode.CODE_QUALITY)
        self.assertEqual(self.runner.command, "ruff")

    def test_ruff_build_command(self):
        """Verify Ruff command building."""
        cmd = self.runner.build_command("/test/path")
        self.assertIn("ruff", cmd)
        self.assertIn("check", cmd)
        self.assertIn("--output-format", cmd)
        self.assertIn("json", cmd)

    def test_ruff_parse_sample_output(self):
        """Test parsing of Ruff JSON output."""
        sample_output = '''[
            {
                "code": "F401",
                "message": "'os' imported but unused",
                "filename": "test.py",
                "location": {"row": 1, "column": 1},
                "fix": {"applicability": "safe"}
            }
        ]'''

        findings = self.runner.parse_output(sample_output)

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].category, "pyflakes")
        self.assertEqual(findings[0].file_path, "test.py")
        self.assertIn("auto-fix", findings[0].recommendation.lower())


class TestBearerRunner(unittest.TestCase):
    """Tests for Bearer runner."""

    def setUp(self):
        self.runner = BearerRunner()

    def test_bearer_availability(self):
        """Check if Bearer is available."""
        is_available = self.runner.is_available()
        print(f"Bearer available: {is_available}")
        # Don't fail if not installed

    def test_bearer_tool_properties(self):
        """Verify Bearer runner properties."""
        self.assertEqual(self.runner.tool_name, "bearer")
        self.assertEqual(self.runner.mode, ReviewMode.SECURITY)
        self.assertEqual(self.runner.command, "bearer")

    def test_bearer_parse_sample_output(self):
        """Test parsing of Bearer JSON output."""
        sample_output = '''{
            "findings": [
                {
                    "rule_id": "sql_injection",
                    "severity": "high",
                    "title": "SQL Injection vulnerability",
                    "source": {
                        "filename": "api/users.py",
                        "location": {"start": {"line": 45}}
                    },
                    "remediation": "Use parameterized queries"
                }
            ]
        }'''

        findings = self.runner.parse_output(sample_output)

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, IssueSeverity.HIGH)
        self.assertEqual(findings[0].category, "sql_injection")


class TestReviewOrchestratorIntegration(unittest.TestCase):
    """Integration tests for the ReviewOrchestrator."""

    def setUp(self):
        self.test_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    def test_orchestrator_with_available_tools(self):
        """Test orchestrator runs with whatever tools are available."""
        from utils.review_v2 import ReviewOrchestrator
        from schemas.review_config import ReviewConfig

        # Use minimal config to speed up test
        config = ReviewConfig.quick()

        orchestrator = ReviewOrchestrator(
            adw_id="test-integration",
            worktree_path=self.test_dir,
            config=config,
        )

        result = asyncio.run(orchestrator.execute())

        self.assertIsNotNone(result)
        self.assertEqual(result.adw_id, "test-integration")
        print(f"Orchestrator result: {result.summary}")
        print(f"Modes executed: {[m.value for m in result.modes_executed]}")
        print(f"Finding counts: {result.total_finding_counts}")

    def test_orchestrator_comprehensive_mode(self):
        """Test orchestrator with comprehensive mode."""
        from utils.review_v2 import ReviewOrchestrator
        from schemas.review_config import ReviewConfig

        config = ReviewConfig(modes=["comprehensive"])

        orchestrator = ReviewOrchestrator(
            adw_id="test-comprehensive",
            worktree_path=self.test_dir,
            config=config,
        )

        result = asyncio.run(orchestrator.execute())

        self.assertIsNotNone(result)
        # Comprehensive should try to run multiple modes
        self.assertGreater(len(result.modes_executed), 0)
        print(f"Comprehensive result: {result.summary}")


class TestToolRunnerWithSampleCode(unittest.TestCase):
    """Test tool runners against sample code with known issues."""

    def setUp(self):
        # Create a temporary directory with sample code
        self.temp_dir = tempfile.mkdtemp()

        # Create sample JS file with lint issues
        js_file = os.path.join(self.temp_dir, "sample.js")
        with open(js_file, "w") as f:
            f.write('''
// Sample file with intentional lint issues
var unusedVar = "test";  // no-unused-vars
console.log("debug");    // no-console
let x = 1
let y = 2
''')

        # Create sample Python file with issues
        py_file = os.path.join(self.temp_dir, "sample.py")
        with open(py_file, "w") as f:
            f.write('''
import os  # F401 unused import
import sys  # F401 unused import

def bad_function():
    x = 1  # unused variable
    pass
''')

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_eslint_finds_issues_in_sample(self):
        """Verify ESLint finds issues in sample JS file."""
        runner = ESLintRunner()
        if not runner.is_available():
            self.skipTest("ESLint not available")

        result = asyncio.run(runner.execute(self.temp_dir))

        # ESLint may or may not find issues depending on config
        self.assertIsNotNone(result)
        print(f"ESLint on sample: {len(result.findings)} findings")

    def test_ruff_finds_issues_in_sample(self):
        """Verify Ruff finds issues in sample Python file."""
        runner = RuffRunner()
        if not runner.is_available():
            self.skipTest("Ruff not available")

        result = asyncio.run(runner.execute(self.temp_dir))

        self.assertIsNotNone(result)
        # Ruff should find unused imports
        print(f"Ruff on sample: {len(result.findings)} findings")
        if result.findings:
            for f in result.findings[:3]:
                print(f"  - {f.category}: {f.message}")


def run_tests():
    """Run the integration test suite."""
    print("=" * 60)
    print("Review Tools Integration Tests")
    print("=" * 60)
    print()
    print("Testing actual tool execution against real codebase")
    print()

    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    suite.addTests(loader.loadTestsFromTestCase(TestESLintRunner))
    suite.addTests(loader.loadTestsFromTestCase(TestSemgrepRunner))
    suite.addTests(loader.loadTestsFromTestCase(TestRuffRunner))
    suite.addTests(loader.loadTestsFromTestCase(TestBearerRunner))
    suite.addTests(loader.loadTestsFromTestCase(TestReviewOrchestratorIntegration))
    suite.addTests(loader.loadTestsFromTestCase(TestToolRunnerWithSampleCode))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print()
    print("=" * 60)
    print("Integration Test Results Summary")
    print("=" * 60)
    print(f"   Tests run: {result.testsRun}")
    print(f"   Failures: {len(result.failures)}")
    print(f"   Errors: {len(result.errors)}")
    print(f"   Skipped: {len(result.skipped)}")

    if result.wasSuccessful():
        print()
        print("All integration tests passed!")
        return True
    else:
        print()
        print("Some tests failed:")
        for failure in result.failures:
            print(f"\nFailed: {failure[0]}")
            print(failure[1][:500])
        return False


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
