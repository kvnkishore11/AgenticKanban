#!/usr/bin/env python3
"""
FastAPI server for ADW management and workflow automation.
"""
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import API routes
from api import adws, stage_logs

app = FastAPI(
    title="ADW Management API",
    description="API for managing Agent-Driven Workflows (ADWs)",
    version="1.0.0"
)

# Configure CORS to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server default
        f"http://localhost:{os.getenv('FRONTEND_PORT', '9204')}",  # Frontend port from env
        "http://localhost:3000",  # Alternative frontend port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(adws.router, prefix="/api")
app.include_router(stage_logs.router)

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "ADW Management API",
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

def main():
    """Main entry point for the server."""
    port = int(os.getenv("BACKEND_PORT", "9104"))
    host = os.getenv("BACKEND_HOST", "0.0.0.0")

    print(f"Starting ADW Management API server on {host}:{port}")
    uvicorn.run(
        "server:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main()
