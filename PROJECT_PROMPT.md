# CLAUDE CODE PROJECT PROMPT

## ROLE

You are acting as a **Senior Software Architect, Product Manager, Senior
Full-Stack Engineer, UI/UX Designer, Database Architect, and DevOps
Engineer**.

Your responsibility is to design and build a **production-ready
enterprise Asset Lifecycle Management & Workflow Platform**.

Do **not** jump directly into coding.

First understand the business, improve the design where appropriate,
document assumptions, then implement the application incrementally.

------------------------------------------------------------------------

# PROJECT

## Project Name

**IT Asset Lifecycle Management & Workflow Platform**

## Project Vision

Build a centralized, workflow-driven web application that manages the
complete lifecycle of company hardware assets.

This application replaces manual paper forms and Excel sheets currently
used by IT, People & Culture (P&C), and Stores.

The platform will become the **single source of truth** for all company
assets.

------------------------------------------------------------------------

# BUSINESS OBJECTIVES

The system must:

-   Digitize every paper form.
-   Replace spreadsheet tracking.
-   Enforce company workflows.
-   Maintain complete audit history.
-   Prevent workflow bypass.
-   Provide live inventory visibility.
-   Improve accountability.
-   Generate reports.
-   Send automated notifications.

------------------------------------------------------------------------

# SOURCE DOCUMENTS

Treat the following documents as the company's current business process
and extract every useful field and workflow from them before
implementation:

-   Asset Allocation & Return Form
-   Device Assessment Form
-   IT Specification for Asset Issuance
-   SOP Laptop Issuance

Do not merely recreate the forms.

Improve the workflow while preserving the business rules.

------------------------------------------------------------------------

# ASSET LIFECYCLE

Model the system around the following lifecycle:

1.  Acquisition
2.  Registration
3.  Available
4.  Allocation
5.  In Use
6.  Repair / Maintenance
7.  Returned
8.  Reallocation
9.  Disposal

Every transition must be recorded.

------------------------------------------------------------------------

# USER ROLES

## Super Admin

Full access.

## Stores Officer

-   Manage inventory
-   Register assets
-   View dashboard
-   Track assignments

## IT Representative

-   Perform inspections
-   Complete assessment checklist
-   Recommend repair/replacement
-   Sign assessments

## People & Culture (P&C)

-   Create allocation
-   Create return workflows
-   Approve workflows
-   View employee history
-   Sign documentation

## Employee

-   Login
-   Request device
-   Request repair
-   Request replacement
-   View assigned assets
-   Sign allocations and returns

------------------------------------------------------------------------

# ROLE BASED ACCESS CONTROL

Implement strict RBAC.

Users only see actions relevant to their role.

Protect every API endpoint.

------------------------------------------------------------------------

# CORE MODULES

1.  Authentication
2.  Dashboard
3.  Inventory
4.  Employees
5.  Asset Acquisition
6.  Allocation Workflow
7.  Return Workflow
8.  Device Assessment
9.  Repairs
10. Disposal
11. Notifications
12. Compliance
13. Audit Logs
14. Reports

------------------------------------------------------------------------

# DASHBOARD

Display:

-   Total Assets
-   Available
-   Allocated
-   Under Repair
-   Returned
-   Disposed
-   Lost
-   Stolen
-   Unaccounted

Include:

-   Recent activity feed
-   Pending approvals
-   Pending assessments
-   Pending returns
-   Pending requests

Charts:

-   Assets by Department
-   Assets by Status
-   Assets by Brand
-   Assets by Type
-   Monthly Allocation
-   Monthly Returns

------------------------------------------------------------------------

# INVENTORY

Each asset stores:

-   Asset Tag
-   Barcode / QR Code
-   Device Type
-   Brand
-   Model
-   Serial Number
-   IMEI
-   Purchase Date
-   Purchase Amount
-   Vendor
-   Warranty Expiry
-   Office Location
-   Department
-   Current Holder
-   Status
-   Accessories
-   Notes

Statuses:

-   Available
-   Reserved
-   Allocated
-   Returned
-   Under Repair
-   Disposed
-   Lost
-   Stolen
-   Unaccounted

------------------------------------------------------------------------

# EMPLOYEE PROFILE

Fields:

-   Employee ID
-   Name
-   Email
-   Department
-   Designation
-   Manager
-   Office
-   Employment Status
-   Assigned Assets
-   Asset History

------------------------------------------------------------------------

# ACQUISITION

Capture:

-   Purchase Date
-   Vendor
-   Purchase Amount
-   Invoice Number
-   Facilitated By
-   Asset Details
-   Condition
-   Warranty
-   Asset Tag

------------------------------------------------------------------------

# ASSET ALLOCATION WORKFLOW

Workflow:

Employee Request

↓

P&C Review

↓

Stores Select Asset

↓

IT Assessment

↓

Employee Signature

↓

P&C Signature

↓

IT Signature

↓

Inventory Update

No stage may be skipped.

Employee request types:

-   New Device
-   Repair
-   Replacement
-   Additional Device
-   Accessory

------------------------------------------------------------------------

# DEVICE ASSESSMENT

Digitize the existing checklist and extend it.

Checklist:

-   Screen
-   Keyboard
-   Battery
-   Charger
-   Mouse
-   Bag
-   Webcam
-   Microphone
-   Speakers
-   USB Ports
-   HDMI
-   WiFi
-   Bluetooth
-   Storage
-   RAM
-   OS
-   Antivirus
-   Encryption
-   Asset Sticker
-   Water Damage
-   Physical Damage
-   Missing Components
-   Boots Successfully

Assessment:

-   Pass
-   Repair Recommended
-   Replacement Recommended
-   Reject

Store technician notes.

------------------------------------------------------------------------

# RETURN WORKFLOW

Reasons:

-   Resignation
-   Termination
-   Transfer
-   Replacement
-   Repair
-   Lost
-   Other

Collect:

-   Returned Items
-   Missing Items
-   Damage Notes
-   Photos (optional)
-   Signatures

Inventory updates automatically.

------------------------------------------------------------------------

# REPAIR WORKFLOW

Support repair requests.

Track:

-   Fault
-   Technician
-   Repair Status
-   Cost
-   Vendor
-   Completion Date

------------------------------------------------------------------------

# DISPOSAL

Only authorized users.

Record:

-   Reason
-   Approval
-   Signature
-   Date
-   Evidence

Never delete disposed assets.

------------------------------------------------------------------------

# WORKFLOW ENGINE

Implement a configurable state machine.

Every workflow defines:

-   Current State
-   Allowed Next States
-   Required Role
-   Validation Rules
-   Notifications

Track:

-   Previous State
-   Next State
-   User
-   Timestamp
-   Reason

------------------------------------------------------------------------

# AUDIT LOG

Log every action.

Examples:

-   Login
-   Logout
-   Asset Created
-   Asset Updated
-   Allocation Approved
-   Return Completed
-   Disposal Approved

Capture:

-   User
-   Action
-   Timestamp
-   Old Value
-   New Value
-   IP Address

------------------------------------------------------------------------

# COMPLIANCE

Track SLA breaches.

Examples:

-   Pending approvals
-   Delayed returns
-   Delayed store processing
-   Outstanding signatures

Generate escalation reports.

Email managers automatically.

------------------------------------------------------------------------

# EMAILS

Notify:

-   Employee
-   IT
-   Stores
-   P&C

Events:

-   Allocation
-   Assessment
-   Return
-   Repair
-   Disposal
-   Escalation

------------------------------------------------------------------------

# REPORTS

Generate:

-   Inventory
-   Allocation
-   Return
-   Repairs
-   Disposal
-   Department
-   Employee Asset History
-   Compliance

Export:

-   PDF
-   Excel
-   CSV

------------------------------------------------------------------------

# SEARCH

Global search by:

-   Asset Tag
-   Employee
-   Serial Number
-   IMEI
-   Department

------------------------------------------------------------------------

# DATABASE

Design a normalized relational schema.

Provide:

-   ER Diagram
-   Tables
-   Relationships
-   Foreign Keys
-   Indexes

------------------------------------------------------------------------

# API

Design REST APIs for:

-   Auth
-   Users
-   Employees
-   Assets
-   Assessments
-   Allocation
-   Returns
-   Repairs
-   Disposal
-   Reports
-   Notifications

Document request/response models.

------------------------------------------------------------------------

# FRONTEND

Design an enterprise interface inspired by:

-   Jira
-   ServiceNow
-   Odoo
-   Monday.com
-   Freshservice

Include:

-   Sidebar
-   Dashboard
-   Data Tables
-   Search
-   Filters
-   Activity Timeline
-   Status Badges
-   Responsive Design

------------------------------------------------------------------------

# ARCHITECTURE

Use:

-   Domain Driven Design
-   Clean Architecture
-   SOLID Principles
-   Repository Pattern
-   Service Layer
-   State Machine for workflows
-   Modular folder structure

------------------------------------------------------------------------

# SECURITY

-   JWT Authentication
-   Refresh Tokens
-   Password Hashing
-   Authorization middleware
-   Input validation
-   CSRF/XSS/SQL Injection protection
-   Immutable audit logs

------------------------------------------------------------------------

# TESTING

Include:

-   Unit Tests
-   Integration Tests
-   API Tests
-   End-to-End Tests

------------------------------------------------------------------------

# IMPLEMENTATION PLAN

Phase 1 - Analyze requirements - Ask clarifying questions - Recommend
improvements

Phase 2 - Define architecture - Database - API contracts - Folder
structure

Phase 3 - UI wireframes - User journeys - Workflow diagrams

Phase 4 - Backend implementation

Phase 5 - Frontend implementation

Phase 6 - Testing

Phase 7 - Deployment

Throughout implementation:

-   Explain architectural decisions.
-   Prefer scalable solutions.
-   Avoid hardcoded workflow logic.
-   Build reusable components.
-   Keep the application production-ready.
