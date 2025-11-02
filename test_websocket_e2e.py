#!/usr/bin/env python3
"""
E2E WebSocket Test Script for Ticket Notification Fix
"""

import asyncio
import websockets
import json
import sys
from datetime import datetime

class WebSocketE2ETest:
    def __init__(self, uri="ws://localhost:8002/ws/trigger"):
        self.uri = uri
        self.results = []
        self.failed = False

    def log_result(self, step, passed, message, details=None):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        result = {
            "step": step,
            "passed": passed,
            "message": message,
            "details": details
        }
        self.results.append(result)
        print(f"{status} - Step {step}: {message}")
        if details:
            print(f"  Details: {details}")
        if not passed:
            self.failed = True

    async def test_ping_pong(self, websocket):
        """Test ping/pong functionality"""
        step = 3
        try:
            message = {"type": "ping"}
            await websocket.send(json.dumps(message))
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            response_data = json.loads(response)

            if response_data.get("type") == "pong" and "timestamp" in response_data:
                self.log_result(step, True, "Ping/pong functionality works correctly", response_data)
            else:
                self.log_result(step, False, "Invalid pong response", response_data)
        except Exception as e:
            self.log_result(step, False, f"Ping/pong test failed: {str(e)}")

    async def test_unknown_message_type(self, websocket):
        """Test unknown message type handling"""
        step = 4
        try:
            message = {"type": "unknown_test_type", "data": {}}
            await websocket.send(json.dumps(message))
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            response_data = json.loads(response)

            # Check for error in either top level or data object
            has_error = (response_data.get("type") == "error" and
                        "Unknown message type: unknown_test_type" in str(response_data))

            if has_error:
                self.log_result(step, True, "Unknown message type correctly rejected", response_data)
            else:
                self.log_result(step, False, "Unknown message type not properly handled", response_data)
        except Exception as e:
            self.log_result(step, False, f"Unknown message type test failed: {str(e)}")

    async def test_ticket_notification(self, websocket):
        """Test ticket_notification message handling (MAIN FIX)"""
        step = 5
        try:
            message = {
                "type": "ticket_notification",
                "data": {
                    "id": "test-ticket-001",
                    "title": "E2E Test Ticket",
                    "description": "Test ticket for WebSocket ticket notification fix validation",
                    "workItemType": "bug",
                    "queuedStages": ["plan", "implement", "test"],
                    "stage": "implement",
                    "substage": "coding",
                    "progress": 50,
                    "createdAt": "2025-10-27T06:00:00.000Z",
                    "images": [],
                    "metadata": {
                        "adw_id": "test-adw-001",
                        "workflow_name": "test-workflow"
                    }
                }
            }
            await websocket.send(json.dumps(message))
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            response_data = json.loads(response)

            # Response is wrapped in data object
            data = response_data.get("data", {})

            # Verify response
            checks = []
            checks.append(("type is ticket_notification_response", response_data.get("type") == "ticket_notification_response"))
            checks.append(("status is received", data.get("status") == "received"))
            checks.append(("ticket_id is correct", data.get("ticket_id") == "test-ticket-001"))
            checks.append(("message contains title", "E2E Test Ticket" in str(data.get("message", ""))))
            checks.append(("timestamp exists", "timestamp" in data))
            checks.append(("no validation errors", data.get("error") is None))

            all_passed = all(check[1] for check in checks)
            failed_checks = [check[0] for check in checks if not check[1]]

            if all_passed:
                self.log_result(step, True, "Ticket notification handled correctly (MAIN FIX VERIFIED)", response_data)
            else:
                self.log_result(step, False, f"Ticket notification validation failed: {', '.join(failed_checks)}", response_data)
        except Exception as e:
            self.log_result(step, False, f"Ticket notification test failed: {str(e)}")

    async def test_minimal_ticket_notification(self, websocket):
        """Test ticket_notification with minimal data"""
        step = 6
        try:
            message = {
                "type": "ticket_notification",
                "data": {
                    "id": "minimal-ticket-002",
                    "title": "Minimal Test Ticket"
                }
            }
            await websocket.send(json.dumps(message))
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            response_data = json.loads(response)

            data = response_data.get("data", {})
            if data.get("status") == "received" and data.get("error") is None:
                self.log_result(step, True, "Minimal ticket notification accepted", response_data)
            else:
                self.log_result(step, False, "Minimal ticket notification not accepted", response_data)
        except Exception as e:
            self.log_result(step, False, f"Minimal ticket notification test failed: {str(e)}")

    async def test_invalid_ticket_notification(self, websocket):
        """Test ticket_notification with invalid data"""
        step = 7
        try:
            message = {
                "type": "ticket_notification",
                "data": {
                    "title": "Invalid Test Ticket"
                    # Missing required 'id' field
                }
            }
            await websocket.send(json.dumps(message))
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            response_data = json.loads(response)

            data = response_data.get("data", {})
            if data.get("error") or data.get("status") == "error":
                self.log_result(step, True, "Invalid ticket notification correctly rejected", response_data)
            else:
                self.log_result(step, False, "Invalid ticket notification was incorrectly accepted", response_data)
        except Exception as e:
            self.log_result(step, False, f"Invalid ticket notification test failed: {str(e)}")

    async def test_multiple_notifications(self, websocket):
        """Test multiple consecutive ticket notifications"""
        step = 8
        try:
            success_count = 0
            for i in range(3):
                message = {
                    "type": "ticket_notification",
                    "data": {
                        "id": f"test-ticket-{i+1:03d}",
                        "title": f"Batch Test Ticket {i+1}"
                    }
                }
                await websocket.send(json.dumps(message))
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                response_data = json.loads(response)

                data = response_data.get("data", {})
                if data.get("status") == "received":
                    success_count += 1

            if success_count == 3:
                self.log_result(step, True, "All 3 consecutive notifications processed successfully")
            else:
                self.log_result(step, False, f"Only {success_count}/3 notifications processed successfully")
        except Exception as e:
            self.log_result(step, False, f"Multiple notifications test failed: {str(e)}")

    async def test_mixed_messages(self, websocket):
        """Test mixed message types in single session"""
        step = 9
        try:
            messages = [
                {"type": "ping"},
                {
                    "type": "ticket_notification",
                    "data": {"id": "mixed-test-001", "title": "Mixed Test 1"}
                },
                {
                    "type": "ticket_notification",
                    "data": {"id": "mixed-test-002", "title": "Mixed Test 2"}
                }
            ]

            success_count = 0
            for msg in messages:
                await websocket.send(json.dumps(msg))
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                response_data = json.loads(response)

                if msg["type"] == "ping" and response_data.get("type") == "pong":
                    success_count += 1
                elif msg["type"] == "ticket_notification":
                    data = response_data.get("data", {})
                    if data.get("status") == "received":
                        success_count += 1

            if success_count == len(messages):
                self.log_result(step, True, "All mixed message types handled correctly")
            else:
                self.log_result(step, False, f"Only {success_count}/{len(messages)} mixed messages handled correctly")
        except Exception as e:
            self.log_result(step, False, f"Mixed messages test failed: {str(e)}")

    async def run_tests(self):
        """Run all WebSocket tests"""
        print(f"Connecting to WebSocket server at {self.uri}...")

        try:
            async with websockets.connect(self.uri) as websocket:
                self.log_result(2, True, "WebSocket connection established successfully")

                # Run all tests
                await self.test_ping_pong(websocket)
                await self.test_unknown_message_type(websocket)
                await self.test_ticket_notification(websocket)
                await self.test_minimal_ticket_notification(websocket)
                await self.test_invalid_ticket_notification(websocket)
                await self.test_multiple_notifications(websocket)
                await self.test_mixed_messages(websocket)

        except Exception as e:
            self.log_result(2, False, f"WebSocket connection failed: {str(e)}")
            self.failed = True

        # Print summary
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        passed = sum(1 for r in self.results if r["passed"])
        total = len(self.results)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Status: {'FAILED' if self.failed else 'PASSED'}")

        return 1 if self.failed else 0

if __name__ == "__main__":
    test = WebSocketE2ETest()
    exit_code = asyncio.run(test.run_tests())
    sys.exit(exit_code)
