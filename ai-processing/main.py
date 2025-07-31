from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import os
import logging
import json
from datetime import datetime

# Import custom services
from services.video_processor import VideoProcessor
from services.transcription_service import TranscriptionService
from services.content_analyzer import ContentAnalyzer
from services.chapter_generator import ChapterGenerator
from services.summary_generator import SummaryGenerator
from services.recommendation_engine import RecommendationEngine
from utils.file_handler import FileHandler
from utils.mongodb_client import MongoDBClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="GAIL SmartLearn AI Processing Service",
    description="AI-powered processing for video transcription, chapter generation, and content analysis",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
video_processor = VideoProcessor()
transcription_service = TranscriptionService()
content_analyzer = ContentAnalyzer()
chapter_generator = ChapterGenerator()
summary_generator = SummaryGenerator()
recommendation_engine = RecommendationEngine()
file_handler = FileHandler()
db_client = MongoDBClient()

# Pydantic models
class ProcessingRequest(BaseModel):
    session_id: str
    video_url: str
    audio_url: Optional[str] = None
    mentor_id: str
    domain: str
    skill_level: str
    title: str
    description: str

class ProcessingStatus(BaseModel):
    session_id: str
    status: str
    progress: int
    current_step: str
    error_message: Optional[str] = None
    estimated_completion: Optional[str] = None

class TranscriptionResult(BaseModel):
    full_text: str
    timestamped_segments: List[Dict[str, Any]]
    language: str
    accuracy: float

class ChapterResult(BaseModel):
    title: str
    start_time: float
    end_time: float
    description: str
    key_points: List[str]
    thumbnail: Optional[str] = None
    importance: int

class SummaryResult(BaseModel):
    executive_summary: str
    key_takeaways: List[str]
    action_items: List[str]
    main_topics: List[str]
    difficulty: str
    estimated_read_time: int

class RecommendationResult(BaseModel):
    related_modules: List[Dict[str, Any]]
    prerequisites: List[Dict[str, Any]]
    next_recommended: List[Dict[str, Any]]
    skill_gap_analysis: Dict[str, Any]

# Global processing status tracking
processing_status = {}

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "GAIL SmartLearn AI Processing Service",
        "status": "active",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        # Check database connection
        db_status = await db_client.check_connection()
        
        # Check file storage
        storage_status = file_handler.check_storage()
        
        return {
            "status": "healthy",
            "services": {
                "database": "connected" if db_status else "disconnected",
                "storage": "available" if storage_status else "unavailable",
                "ai_models": "loaded",
                "video_processing": "ready",
                "transcription": "ready"
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@app.post("/process-session")
async def process_session(
    request: ProcessingRequest,
    background_tasks: BackgroundTasks
):
    """Start processing a recorded session"""
    try:
        logger.info(f"Starting processing for session {request.session_id}")
        
        # Initialize processing status
        processing_status[request.session_id] = {
            "status": "in_progress",
            "progress": 0,
            "current_step": "initializing",
            "started_at": datetime.now().isoformat()
        }
        
        # Add background task for processing
        background_tasks.add_task(
            process_session_background,
            request
        )
        
        # Update session status in database
        await db_client.update_session_processing_status(
            request.session_id,
            "transcription",
            {"status": "in_progress", "progress": 0}
        )
        
        return {
            "success": True,
            "message": "Processing started",
            "session_id": request.session_id,
            "status": processing_status[request.session_id]
        }
        
    except Exception as e:
        logger.error(f"Error starting session processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/processing-status/{session_id}")
async def get_processing_status(session_id: str):
    """Get current processing status for a session"""
    try:
        if session_id not in processing_status:
            # Check database for status
            db_status = await db_client.get_session_processing_status(session_id)
            if not db_status:
                raise HTTPException(status_code=404, detail="Session not found")
            return db_status
        
        return {
            "success": True,
            "data": processing_status[session_id]
        }
        
    except Exception as e:
        logger.error(f"Error getting processing status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcribe")
async def transcribe_audio(
    session_id: str,
    audio_file: UploadFile = File(...),
    language: str = "en"
):
    """Transcribe audio file"""
    try:
        logger.info(f"Starting transcription for session {session_id}")
        
        # Save uploaded file
        audio_path = await file_handler.save_uploaded_file(audio_file, "audio")
        
        # Update processing status
        processing_status[session_id] = {
            "status": "in_progress",
            "progress": 20,
            "current_step": "transcribing_audio"
        }
        
        # Perform transcription
        transcription_result = await transcription_service.transcribe_audio(
            audio_path,
            language=language,
            session_id=session_id
        )
        
        # Update progress
        processing_status[session_id]["progress"] = 40
        
        return {
            "success": True,
            "data": transcription_result
        }
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        processing_status[session_id] = {
            "status": "failed",
            "error": str(e),
            "current_step": "transcription_failed"
        }
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-chapters")
async def generate_chapters(
    session_id: str,
    video_path: str,
    transcript: str
):
    """Generate video chapters using AI"""
    try:
        logger.info(f"Generating chapters for session {session_id}")
        
        # Update processing status
        if session_id in processing_status:
            processing_status[session_id]["current_step"] = "generating_chapters"
            processing_status[session_id]["progress"] = 60
        
        # Generate chapters
        chapters = await chapter_generator.generate_chapters(
            video_path=video_path,
            transcript=transcript,
            session_id=session_id
        )
        
        # Update progress
        if session_id in processing_status:
            processing_status[session_id]["progress"] = 80
        
        return {
            "success": True,
            "data": chapters
        }
        
    except Exception as e:
        logger.error(f"Chapter generation error: {str(e)}")
        if session_id in processing_status:
            processing_status[session_id]["status"] = "failed"
            processing_status[session_id]["error"] = str(e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-summary")
async def generate_summary(
    session_id: str,
    transcript: str,
    domain: str,
    skill_level: str
):
    """Generate AI-powered summary"""
    try:
        logger.info(f"Generating summary for session {session_id}")
        
        # Update processing status
        if session_id in processing_status:
            processing_status[session_id]["current_step"] = "generating_summary"
        
        # Generate summary
        summary = await summary_generator.generate_summary(
            transcript=transcript,
            domain=domain,
            skill_level=skill_level,
            session_id=session_id
        )
        
        return {
            "success": True,
            "data": summary
        }
        
    except Exception as e:
        logger.error(f"Summary generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-content")
async def analyze_content(
    session_id: str,
    transcript: str,
    domain: str
):
    """Analyze content for tags and keywords"""
    try:
        logger.info(f"Analyzing content for session {session_id}")
        
        # Analyze content
        analysis = await content_analyzer.analyze_content(
            transcript=transcript,
            domain=domain,
            session_id=session_id
        )
        
        return {
            "success": True,
            "data": analysis
        }
        
    except Exception as e:
        logger.error(f"Content analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-recommendations")
async def generate_recommendations(
    user_id: str,
    domain: str,
    skill_level: str,
    completed_modules: List[str] = None
):
    """Generate learning recommendations for a user"""
    try:
        logger.info(f"Generating recommendations for user {user_id}")
        
        recommendations = await recommendation_engine.generate_recommendations(
            user_id=user_id,
            domain=domain,
            skill_level=skill_level,
            completed_modules=completed_modules or []
        )
        
        return {
            "success": True,
            "data": recommendations
        }
        
    except Exception as e:
        logger.error(f"Recommendation generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_session_background(request: ProcessingRequest):
    """Background task to process entire session"""
    try:
        session_id = request.session_id
        logger.info(f"Background processing started for session {session_id}")
        
        # Step 1: Download and prepare files
        processing_status[session_id].update({
            "current_step": "downloading_files",
            "progress": 10
        })
        
        video_path = await file_handler.download_file(request.video_url, "video")
        audio_path = await video_processor.extract_audio(video_path)
        
        # Step 2: Transcription
        processing_status[session_id].update({
            "current_step": "transcribing",
            "progress": 30
        })
        
        transcription = await transcription_service.transcribe_audio(
            audio_path, session_id=session_id
        )
        
        # Update database
        await db_client.update_session_processing_status(
            session_id,
            "transcription",
            {"status": "completed", "progress": 100}
        )
        
        # Step 3: Generate chapters
        processing_status[session_id].update({
            "current_step": "generating_chapters",
            "progress": 50
        })
        
        chapters = await chapter_generator.generate_chapters(
            video_path, transcription["full_text"], session_id
        )
        
        await db_client.update_session_processing_status(
            session_id,
            "chapters",
            {"status": "completed", "progress": 100}
        )
        
        # Step 4: Generate summary
        processing_status[session_id].update({
            "current_step": "generating_summary",
            "progress": 70
        })
        
        summary = await summary_generator.generate_summary(
            transcription["full_text"],
            request.domain,
            request.skill_level,
            session_id
        )
        
        await db_client.update_session_processing_status(
            session_id,
            "summary",
            {"status": "completed", "progress": 100}
        )
        
        # Step 5: Content analysis and tagging
        processing_status[session_id].update({
            "current_step": "analyzing_content",
            "progress": 85
        })
        
        analysis = await content_analyzer.analyze_content(
            transcription["full_text"],
            request.domain,
            session_id
        )
        
        await db_client.update_session_processing_status(
            session_id,
            "tagging",
            {"status": "completed", "progress": 100}
        )
        
        # Step 6: Create learning module
        processing_status[session_id].update({
            "current_step": "creating_learning_module",
            "progress": 95
        })
        
        learning_module_data = {
            "session_id": session_id,
            "transcription": transcription,
            "chapters": chapters,
            "summary": summary,
            "analysis": analysis,
            "video_url": request.video_url,
            "mentor_id": request.mentor_id,
            "domain": request.domain,
            "skill_level": request.skill_level,
            "title": request.title,
            "description": request.description
        }
        
        module_id = await db_client.create_learning_module(learning_module_data)
        
        # Final step: Complete processing
        processing_status[session_id].update({
            "current_step": "completed",
            "progress": 100,
            "status": "completed",
            "completed_at": datetime.now().isoformat(),
            "learning_module_id": module_id
        })
        
        # Update session with learning module reference
        await db_client.update_session_learning_module(session_id, module_id)
        
        logger.info(f"Processing completed for session {session_id}")
        
    except Exception as e:
        logger.error(f"Background processing failed for session {session_id}: {str(e)}")
        processing_status[session_id].update({
            "status": "failed",
            "error": str(e),
            "failed_at": datetime.now().isoformat()
        })
        
        # Update all processing statuses to failed
        for process_type in ["transcription", "chapters", "summary", "tagging"]:
            await db_client.update_session_processing_status(
                session_id,
                process_type,
                {"status": "failed", "error_message": str(e)}
            )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )