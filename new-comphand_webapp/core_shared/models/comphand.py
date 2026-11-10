from __future__ import annotations
from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, DateTime, Numeric, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base
from core.encryption import EncryptedString

def utcnow():
    return datetime.now(timezone.utc)

class Channel(Base):
    __tablename__ = "channel"
    __table_args__ = {"schema": "comphand"}
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    channels_code = Column(String(50), primary_key=True)
    channel_name = Column(String(255), nullable=False)
    isdeleted = Column(String(1), nullable=False, default='N')
    user_input = Column(String(50))
    user_otor = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

class RequestType(Base):
    __tablename__ = "request_type"
    __table_args__ = {"schema": "comphand"}
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    req_code = Column(String(50), primary_key=True)
    req_name = Column(String(255), nullable=False)
    isdeleted = Column(String(1), nullable=False, default='N')
    user_input = Column(String(50))
    user_otor = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

class City(Base):
    __tablename__ = "city"
    __table_args__ = {"schema": "comphand"}
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    city_code = Column(String(50), primary_key=True)
    city_name = Column(String(255), nullable=False)
    isdeleted = Column(String(1), nullable=False, default='N')
    user_input = Column(String(50))
    user_otor = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

class Branch(Base):
    __tablename__ = "branch"
    __table_args__ = {"schema": "comphand"}
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    branch_code = Column(String(50), primary_key=True)
    branch_name = Column(String(255), nullable=False)
    city_code = Column(String(50))
    isdeleted = Column(String(1), nullable=False, default='N')
    user_input = Column(String(50))
    user_otor = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

class Code601(Base):
    __tablename__ = "code_601"
    __table_args__ = {"schema": "comphand"}
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    product_code = Column(String(50), primary_key=True)
    product_name = Column(String(255), nullable=False)
    isdeleted = Column(String(1), nullable=False, default='N')
    user_input = Column(String(50))
    user_otor = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

class Code601Info(Base):
    __tablename__ = "code_601_info"
    __table_args__ = {"schema": "comphand"}
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    productinfo_code = Column(String(50), primary_key=True)
    productinfo_name = Column(String(255), nullable=False)
    isdeleted = Column(String(1), nullable=False, default='N')
    user_input = Column(String(50))
    user_otor = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

class Code602(Base):
    __tablename__ = "code_602"
    __table_args__ = {"schema": "comphand"}
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    product_code = Column(String(50), primary_key=True)
    product_name = Column(String(255), nullable=False)
    isdeleted = Column(String(1), nullable=False, default='N')
    user_input = Column(String(50))
    user_otor = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

class Code602Info(Base):
    __tablename__ = "code_602_info"
    __table_args__ = {"schema": "comphand"}
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    productinfo_code = Column(String(50), primary_key=True)
    productinfo_name = Column(String(255), nullable=False)
    isdeleted = Column(String(1), nullable=False, default='N')
    user_input = Column(String(50))
    user_otor = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

class Code603(Base):
    __tablename__ = "code_603"
    __table_args__ = {"schema": "comphand"}
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    product_code = Column(String(50), primary_key=True)
    product_name = Column(String(255), nullable=False)
    isdeleted = Column(String(1), nullable=False, default='N')
    user_input = Column(String(50))
    user_otor = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

class Code603Info(Base):
    __tablename__ = "code_603_info"
    __table_args__ = {"schema": "comphand"}
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    productinfo_code = Column(String(50), primary_key=True)
    productinfo_name = Column(String(255), nullable=False)
    isdeleted = Column(String(1), nullable=False, default='N')
    user_input = Column(String(50))
    user_otor = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

class Code604(Base):
    __tablename__ = "code_604"
    __table_args__ = {"schema": "comphand"}
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    product_code = Column(String(50), primary_key=True)
    product_name = Column(String(255), nullable=False)
    isdeleted = Column(String(1), nullable=False, default='N')
    user_input = Column(String(50))
    user_otor = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

class Code604Info(Base):
    __tablename__ = "code_604_info"
    __table_args__ = {"schema": "comphand"}
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    productinfo_code = Column(String(50), primary_key=True)
    productinfo_name = Column(String(255), nullable=False)
    isdeleted = Column(String(1), nullable=False, default='N')
    user_input = Column(String(50))
    user_otor = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

class Code605(Base):
    __tablename__ = "code_605"
    __table_args__ = {"schema": "comphand"}
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    product_code = Column(String(50), primary_key=True)
    product_name = Column(String(255), nullable=False)
    isdeleted = Column(String(1), nullable=False, default='N')
    user_input = Column(String(50))
    user_otor = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

class Code605Info(Base):
    __tablename__ = "code_605_info"
    __table_args__ = {"schema": "comphand"}
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    productinfo_code = Column(String(50), primary_key=True)
    productinfo_name = Column(String(255), nullable=False)
    isdeleted = Column(String(1), nullable=False, default='N')
    user_input = Column(String(50))
    user_otor = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

class CompType(Base):
    __tablename__ = "comp_type"
    __table_args__ = {"schema": "comphand"}
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    code = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    isdeleted = Column(String(1), nullable=False, default='N')
    user_input = Column(String(50))
    user_otor = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

class Complaint(Base):
    __tablename__ = "complaints"
    __table_args__ = {"schema": "comphand"}

    request_id = Column(String(50), primary_key=True)
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    customer_name = Column(EncryptedString, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    location = Column(String(255))
    city_code = Column(String(50), nullable=False)
    branch_code = Column(String(50), nullable=False)
    atm_card_number = Column(EncryptedString, nullable=False)
    description = Column(Text, nullable=False)
    received_date = Column(Date, nullable=False)
    incident_date = Column(Date, nullable=False)
    completion_date = Column(Date)
    channel_code = Column('channel', String(50), nullable=False)

    incident_checkbox = Column(String(1), nullable=False, default='N')
    request_type = Column(String(50))
    channel_source = Column('comp_source', String(50))
    address = Column(EncryptedString)
    status = Column(String(50))

    settlement_number = Column(String(50))
    extension_number = Column(String(50))

    reg_product_601 = Column('code_601_product', String(100))
    reg_problem_601 = Column('code_601_problem', String(100))
    reg_product_602 = Column('code_602_product', String(100))
    reg_problem_602 = Column('code_602_problem', String(100))
    reg_product_603 = Column('code_603_product', String(100))
    reg_problem_603 = Column('code_603_problem', String(100))
    reg_product_604 = Column('code_604_product', String(100))
    reg_problem_604 = Column('code_604_problem', String(100))
    reg_product_605 = Column('code_605_product', String(100))
    reg_problem_605 = Column('code_605_problem', String(100))

    complaint_file_path = Column('pengaduan_file_path', String(255), nullable=False)
    resolution_file_path = Column('penyelesaian_file_path', String(255))
    extension_file_path = Column('perpanjangan_file_path', String(255))

    aging = Column(Integer, default=0)
    user_input = Column(String(50))
    user_otor = Column(String(50))
    is_deleted = Column('isdeleted', String(1), default='N')
    action = Column(String(20))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

class ComplaintOtor(Base):
    __tablename__ = "complaints_otor"
    __table_args__ = {"schema": "comphand"}

    request_id = Column(String(50), primary_key=True)
    uuid = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    customer_name = Column(EncryptedString, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    location = Column(String(255))
    city_code = Column(String(50), nullable=False)
    branch_code = Column(String(50), nullable=False)
    atm_card_number = Column(EncryptedString, nullable=False)
    description = Column(Text, nullable=False)
    received_date = Column(Date, nullable=False)
    incident_date = Column(Date, nullable=False)
    completion_date = Column(Date)
    channel_code = Column('channel', String(50), nullable=False)

    incident_checkbox = Column(String(1), nullable=False, default='N')
    request_type = Column(String(50))
    channel_source = Column('comp_source', String(50))
    address = Column(EncryptedString)
    status = Column(String(50))

    settlement_number = Column(String(50))
    extension_number = Column(String(50))

    reg_product_601 = Column('code_601_product', String(100))
    reg_problem_601 = Column('code_601_problem', String(100))
    reg_product_602 = Column('code_602_product', String(100))
    reg_problem_602 = Column('code_602_problem', String(100))
    reg_product_603 = Column('code_603_product', String(100))
    reg_problem_603 = Column('code_603_problem', String(100))
    reg_product_604 = Column('code_604_product', String(100))
    reg_problem_604 = Column('code_604_problem', String(100))
    reg_product_605 = Column('code_605_product', String(100))
    reg_problem_605 = Column('code_605_problem', String(100))

    complaint_file_path = Column('pengaduan_file_path', String(255), nullable=False)
    resolution_file_path = Column('penyelesaian_file_path', String(255))
    extension_file_path = Column('perpanjangan_file_path', String(255))

    aging = Column(Integer, default=0)
    user_input = Column(String(50))
    user_otor = Column(String(50))
    is_deleted = Column('isdeleted', String(1), default='N')
    action = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

class MasterOtor(Base):
    __tablename__ = "master_otor"
    __table_args__ = {"schema": "comphand"}

    uuid = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code1 = Column(String(255))
    name = Column(String(255))
    code2 = Column(String(255))
    user_input = Column(String(255))
    user_otor = Column(String(255))
    action = Column(String(255))
    type_prs = Column(String(255))
    # User requested using created_at for timestamp
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)