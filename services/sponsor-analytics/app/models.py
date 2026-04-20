from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SponsorZone(BaseModel):
    sponsor_zone_id: str
    venue_id: str
    zone_id: str
    sponsor_name: str
    booth_coordinates: dict


class SponsorOffer(BaseModel):
    offer_id: str
    sponsor_zone_id: str
    message: str
    deep_link: str
    valid_until: datetime


class SponsorAnalytics(BaseModel):
    sponsor_zone_id: str
    venue_id: str
    event_id: str
    total_footfall: int
    avg_dwell_time_seconds: float
    peak_footfall: int
    unique_visitors: int
    offer_deliveries: int
    offer_click_through_rate: float


class OfferDelivery(BaseModel):
    delivery_id: str
    attendee_id: str
    offer_id: str
    event_id: str
    delivered_at: datetime
    clicked: bool = False
