from pydantic import BaseModel


class TicketStatusCount(BaseModel):
    status: str
    count: int


class AgentStats(BaseModel):
    agent_id:     int
    agent_name:   str
    assigned:     int
    resolved:     int
    avg_rating:   float | None = None
    rating_count: int = 0
    star_counts:  dict[int, int] = {}   # {1: n, 2: n, 3: n, 4: n, 5: n}


class SystemStats(BaseModel):
    total_tickets:        int
    open_tickets:         int
    resolved_tickets:     int
    escalated_tickets:    int
    cancelled_tickets:    int = 0
    avg_resolution_hours: float | None = None
    by_status:  list[TicketStatusCount]
    agent_stats: list[AgentStats]
