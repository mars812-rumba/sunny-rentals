"""Check the API token budget without importing the live backend or calling AI."""
import ast
from pathlib import Path
import unittest


class ClaudeTokenBudgetTests(unittest.TestCase):
    def test_first_and_followup_messages_have_room_for_thinking_and_text(self):
        source = Path(__file__).resolve().parents[1] / "web_integration.py"
        tree = ast.parse(source.read_text(encoding="utf-8"))
        handler = next(
            node for node in tree.body
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
            and node.name == "process_claude_message"
        )
        assignment = next(
            node for node in ast.walk(handler)
            if isinstance(node, ast.Assign)
            and any(isinstance(target, ast.Name) and target.id == "max_tokens" for target in node.targets)
        )
        expression = compile(ast.Expression(assignment.value), str(source), "eval")
        for first_message in (True, False):
            with self.subTest(first_message=first_message):
                self.assertEqual(eval(expression, {"is_first_message": first_message}), 4096)
        payload = next(
            node for node in ast.walk(handler)
            if isinstance(node, ast.Dict)
            and any(isinstance(key, ast.Constant) and key.value == "max_tokens" for key in node.keys)
        )
        value = next(
            value for key, value in zip(payload.keys, payload.values)
            if isinstance(key, ast.Constant) and key.value == "max_tokens"
        )
        self.assertIsInstance(value, ast.Name)
        self.assertEqual(value.id, "max_tokens")
