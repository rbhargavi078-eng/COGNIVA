
from datetime import datetime
from typing import Literal
from database import get_connection, initialize_database

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="Cogniva API",
    description="Memory assistance and caregiver support",
    version="1.0.0",
)

@app.on_event("startup")
def startup():
    initialize_database()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Reminder(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    category: Literal["Medicine", "Appointment", "Task"]
    time: str
    repeat: Literal["Once", "Daily"] = "Once"
    patient_id: str

class ReminderStatusUpdate(BaseModel):
    status: Literal["Upcoming", "Completed", "Missed"]

reminders = []
next_id = 1


@app.get("/")
def home():
    return {
        "message": "Welcome to Cogniva Backend!",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}



@app.post("/reminders")
def create_reminder(reminder: Reminder):
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO reminders
                (title, category, time, repeat, patient_id, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                reminder.title,
                reminder.category,
                reminder.time,
                reminder.repeat,
                reminder.patient_id,
                "Upcoming",
                datetime.now().isoformat(),
            ),
        )

        reminder_id = cursor.lastrowid
        row = connection.execute(
            "SELECT * FROM reminders WHERE id = ?",
            (reminder_id,),
        ).fetchone()

        return dict(row)



@app.get("/reminders")
def get_reminders(patient_id: str):
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM reminders WHERE patient_id = ? ORDER BY id",
            (patient_id,),
        ).fetchall()

        return [dict(row) for row in rows]

@app.delete("/reminders/{reminder_id}")
def delete_reminder(reminder_id: int):
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM reminders WHERE id = ?",
            (reminder_id,),
        )

        if cursor.rowcount == 0:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=404,
                detail="Reminder not found",
            )

        return {
            "status": "success",
            "message": "Reminder deleted successfully",
        }

    
@app.patch("/reminders/{reminder_id}/status")
def update_reminder_status(
    reminder_id: int,
    update: ReminderStatusUpdate,
):
    with get_connection() as connection:
        cursor = connection.execute(
            "UPDATE reminders SET status = ? WHERE id = ?",
            (update.status, reminder_id),
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Reminder not found",
            )

        row = connection.execute(
            "SELECT * FROM reminders WHERE id = ?",
            (reminder_id,),
        ).fetchone()

        return dict(row)
