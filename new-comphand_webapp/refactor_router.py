import re

path = r"d:\NEW INTRANET APPS\BMAS-INTERNAL-APPS\BMASINTERNALAPPS\bmasinternalapps\programs\comphand\router.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update SELECT queries to include c.uuid
content = content.replace(
    "SELECT c.request_id, c.customer_name, ch.channel_name, c.channel,",
    "SELECT c.uuid, c.request_id, c.customer_name, ch.channel_name, c.channel,"
)

# 2. Update update_complaint endpoint
content = content.replace(
    '@router.put("/complaints/{request_id}")\nasync def update_complaint(\n    request_id: str,',
    '@router.put("/complaints/{id}")\nasync def update_complaint(\n    id: str,'
)
content = content.replace(
    "WHERE request_id = :request_id AND isdeleted = 'N'",
    "WHERE uuid = :id AND isdeleted = 'N'"
)
content = content.replace(
    '{"request_id": request_id}).mappings().first()',
    '{"id": id}).mappings().first()'
)
content = content.replace(
    '{"request_id": request_id}).first()',
    '{"id": id}).first()'
)

# 3. Update request_delete_complaint
content = content.replace(
    '@router.post("/complaints/{request_id}/request-delete")\nasync def request_delete_complaint(\n    request_id: str,',
    '@router.post("/complaints/{id}/request-delete")\nasync def request_delete_complaint(\n    id: str,'
)

# 4. Update get_complaint_detail
content = content.replace(
    '@router.get("/complaints/{request_id}")\nasync def get_complaint_detail(\n    request_id: str,',
    '@router.get("/complaints/{id}")\nasync def get_complaint_detail(\n    id: str,'
)
content = content.replace(
    "WHERE c.request_id = :request_id AND c.isdeleted = 'N'",
    "WHERE c.uuid = :id AND c.isdeleted = 'N'"
)

# 5. Update get_comp_otor_detail
content = content.replace(
    '@router.get("/complaints-otor/{request_id}")\nasync def get_comp_otor_detail(\n    request_id: str,',
    '@router.get("/complaints-otor/{id}")\nasync def get_comp_otor_detail(\n    id: str,'
)

# 6. Update approve_complaint_otor
content = content.replace(
    '@router.post("/complaints-otor/{request_id}/approve")\nasync def approve_complaint_otor(\n    request_id: str,',
    '@router.post("/complaints-otor/{id}/approve")\nasync def approve_complaint_otor(\n    id: str,'
)

# 7. Update reject_complaint_otor
content = content.replace(
    '@router.post("/complaints-otor/{request_id}/reject")\nasync def reject_complaint_otor(\n    request_id: str,',
    '@router.post("/complaints-otor/{id}/reject")\nasync def reject_complaint_otor(\n    id: str,'
)

# Also fix the inner references in the endpoints where we replaced request_id with id, but it still tries to use request_id
# We should probably fetch the request_id from the DB first to use it for logging / files, but wait, the update and delete operations need
# This means we need a smarter refactor!