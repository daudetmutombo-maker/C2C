from pydantic import BaseModel
from typing import Optional, List


class DecisionBase(BaseModel):
    ref: str
    intitule: str
    responsable: str
    echeance: str
    avancement: Optional[int] = 0
    statut: Optional[str] = "vert"
    autorite: Optional[str] = "Présidence"
    echeances_inter: Optional[str] = ""
    difficultes: Optional[str] = ""
    mesures: Optional[str] = ""


class DecisionCreate(DecisionBase):
    pass


class Decision(DecisionBase):
    id: int

    class Config:
        from_attributes = True


class MessageBase(BaseModel):
    expediteur: str
    contenu: str
    timestamp: str


class MessageCreate(MessageBase):
    pass


class Message(MessageBase):
    id: int

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


class UserSchema(BaseModel):
    username: str
    role: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    status: str
    token: str
    user: UserSchema
