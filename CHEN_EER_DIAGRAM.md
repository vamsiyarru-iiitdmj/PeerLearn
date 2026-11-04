# PeerLearn — Conceptual Chen & Enhanced ER (EER) Diagram Specification

> **Project**: PeerLearn (Peer-to-Peer Academic Assistance & Knowledge Sharing Platform)  
> **Model Type**: Conceptual Entity-Relationship (ER) & Enhanced Entity-Relationship (EER) Model  
> **Notation**: Classic Peter Chen Notation with Extended EER Modeling (Subclasses, Superclasses, Specialization Circles, Identifying Relationships, Weak Entities, Multivalued & Derived Attributes, Min-Max Cardinalities, Relationship Attributes)  
> **Canvas Dimensions**: 4800 × 3600 px (10 Non-Overlapping Spaced Zones)  
> **Companion Files**: [`PEERLEARN_CHEN_EER.drawio`](file:///c:/Users/vamsi/OneDrive/Desktop/peerlearn/PEERLEARN_CHEN_EER.drawio) (Direct Draw.io Canvas) & [`ER_DIAGRAM.md`](file:///c:/Users/vamsi/OneDrive/Desktop/peerlearn/ER_DIAGRAM.md) (Relational Crow's Foot Schema)

---

## Table of Contents

1. [Chen & EER Notation Legend](#1-chen--eer-notation-legend)
2. [Complete Conceptual Architecture](#2-complete-conceptual-architecture)
3. [Superclasses, Subclasses & Specialization (EER)](#3-superclasses-subclasses--specialization-eer)
   - 3.1 [Student Hierarchy: Overlapping Specialization (o)](#31-student-hierarchy-overlapping-specialization-o)
   - 3.2 [Resource Hierarchy: Disjoint Specialization (d) & Full Connectivity](#32-resource-hierarchy-disjoint-specialization-d--full-connectivity)
4. [Strong vs. Weak Entities & Identifying Relationships](#4-strong-vs-weak-entities--identifying-relationships)
5. [Attribute Taxonomy & Relationship Attributes](#5-attribute-taxonomy--relationship-attributes)
   - 5.1 [Key Attributes (Primary & Candidate Keys)](#51-key-attributes-primary--candidate-keys)
   - 5.2 [Partial Keys / Discriminators](#52-partial-keys--discriminators)
   - 5.3 [Multivalued Attributes](#53-multivalued-attributes)
   - 5.4 [Derived / Computed Attributes](#54-derived--computed-attributes)
   - 5.5 [Composite Attributes](#55-composite-attributes)
   - 5.6 [Relationship Attributes (Attached to Rhombuses)](#56-relationship-attributes-attached-to-rhombuses)
6. [Complete Relationship & Min-Max Cardinality Directory](#6-complete-relationship--min-max-cardinality-directory)
7. [Chen ER Diagram in Graphviz DOT & PlantUML](#7-chen-er-diagram-in-graphviz-dot--plantuml)
8. [Draw.io Native XML for Chen EER Diagram](#8-drawio-native-xml-for-chen-eer-diagram)
9. [How to Open & View in Draw.io](#9-how-to-open--view-in-drawio)

---

## 1. Chen & EER Notation Legend

In Peter Chen's classic ER notation and Enhanced ER (EER) extensions:

| Concept | Visual Symbol | Semantic Meaning in PeerLearn |
|---------|---------------|-------------------------------|
| **Strong Entity** | **Single Rectangle** | An autonomous entity with an independent primary key (e.g. `STUDENT`, `DOUBT`, `SESSION`, `SKILL`, `TASK`, `RESOURCE_BUCKET`, `RESOURCE`). |
| **Weak Entity** | **Double Rectangle** | An existence-dependent entity that cannot exist without an owner strong entity (e.g. `SESSION_MESSAGE`, `SESSION_RATING`, `TUTOR_SCORE_SNAPSHOT`, `RESOURCE_VOTE`). |
| **Regular Relationship** | **Single Rhombus (Diamond)** | An association connecting two or more strong entities (e.g. `Asks`, `Owns_Bucket`, `Contains`, `Stages`, `Certified_In`). |
| **Identifying Relationship** | **Double Rhombus (Diamond)** | The relationship through which a weak entity borrows identity from its owner entity (e.g. `Contains_Chat`, `Evaluated_By`, `Rated_In`, `Receives_Vote`). |
| **Relationship Attribute** | **Oval Attached to Diamond** | An attribute that belongs to the relationship itself rather than either entity (e.g. `certified_at`, `booked_at`, `tagged_at`, `scheduled_start`, `vote`). |
| **Simple Attribute** | **Single Oval (Ellipse)** | An atomic property of an entity (e.g. `full_name`, `status`, `title`). |
| **Key Attribute (Primary Key)** | **Oval with Underlined Text** | Unique identifier attribute (e.g. <u>id</u>, <u>roll_number</u>). |
| **Candidate Key** | **Oval with Underlined Text & CK** | Natural unique alternative key (e.g. <u>(roll_number, semester)</u> in `ACADEMIC_RECORD`). |
| **Partial Key (Discriminator)** | **Oval with Dashed Underline** | Distinguishes weak entity occurrences under the same parent (e.g. - - <u>created_at</u> - - in chat messages). |
| **Multivalued Attribute** | **Double Oval (Double Ellipse)** | An attribute that can hold multiple values for a single entity (e.g. `phone` in `STUDENT`). |
| **Derived Attribute** | **Dashed Oval (Dashed Ellipse)** | An attribute computed/aggregated dynamically from other tables (e.g. `score`, `rank`, `upvotes_count`, `downvotes_count`). |
| **Specialization Circle `(o)`** | **Circle containing `o`** | **Overlapping specialization**: an entity can simultaneously belong to multiple subclasses (e.g. a `STUDENT` can be both a `LEARNER` and a `TUTOR`). |
| **Specialization Circle `(d)`** | **Circle containing `d`** | **Disjoint specialization**: an entity can belong to at most one subclass (e.g. a `RESOURCE` is disjointly either a `PDF`, `LINK`, `PHOTO`, or `TEXT`). |
| **Min-Max Cardinality `(min, max)`** | **Explicit Text on Connector Edges** | Formal structural constraint on entity participation: `min` specifies mandatory (`1`) or optional (`0`) participation; `max` specifies upper bound (`1` or `N`). |

---

## 2. Complete Conceptual Architecture

```
                    ┌───────────────────────────────────────────────┐
                    │               ACADEMIC_RECORD                 │ (Ground Truth Audit)
                    │  (roll_number, semester, cpi, cgpa, credits)  │
                    └──────────────────────┬────────────────────────┘
                                           │ verifies (1,1) : (1,1)
                                           ▼
                         ┌───────────────────────────────────┐
                         │              STUDENT              │ (Superclass)
                         │  (id, roll_number, email, name)   │
                         └─────────────────┬─────────────────┘
                                           │
                                     (o) Overlapping Specialization
                         ┌─────────────────┴─────────────────┐
                         ▼                                   ▼
             ┌───────────────────────┐           ┌───────────────────────┐
             │        LEARNER        │           │         TUTOR         │ (Subclasses)
             │ (asks doubts, tasks)  │           │ (pro skills, scores)  │
             └───────────┬───────────┘           └───────────┬───────────┘
                         │                                   │
              ┌──────────┴──────────┐             ┌──────────┴──────────┐
              ▼                     ▼             ▼                     ▼
        ◇ Asks ◇             ◇ Plans ◇      ◇ Locks/Books ◇       ◇ Certified_In ◇
         (1,N)                 (1,N)           (1,N)                  (M,N)
              │                     │             │                     │
              ▼                     ▼             ▼                     ▼
        ┌───────────┐         ┌───────────┐ ┌───────────┐         ┌───────────┐
        │   DOUBT   │         │   TASK    │ │  SESSION  │         │   SKILL   │
        └─────┬─────┘         └───────────┘ └─────┬─────┘         └───────────┘
              │                                   │
        ◈ Schedules_Into ◈                  ◈ Contains_Chat ◈
         (1,1)                               (1,N)
              │                                   │
              ▼                                   ▼
        ┌───────────┐                       ╔═════════════════╗
        │  SESSION  │                       ║ SESSION_MESSAGE ║ (Weak Entity)
        └─────┬─────┘                       ╚═════════════════╝
              │
        ◈ Rated_In ◈ (1,1)
              │
              ▼
        ╔════════════════╗
        ║ SESSION_RATING ║ (Weak Entity)
        ╚════════════════╝
```

---

## 3. Superclasses, Subclasses & Specialization (EER)

In the PeerLearn domain, Enhanced Entity-Relationship (EER) modeling captures two core inheritance hierarchies:

### 3.1 Student Hierarchy: Overlapping Specialization `(o)`

Peer learning operates on the principle that **every student can be both a learner seeking help in challenging topics and a tutor teaching subjects in which they excel**.

```
                           ┌────────────────────────┐
                           │        STUDENT         │ (Superclass)
                           │ ---------------------- │
                           │ <u>id</u> (PK)             │
                           │ <u>roll_number</u> (UK)     │
                           │ <u>institute_email</u> (UK) │
                           │ full_name              │
                           │ department             │
                           │ year_of_study          │
                           └───────────┬────────────┘
                                       │
                                     [ o ]  Overlapping Specialization
                                  ┌────┴────┐
                   Partial (0,1)  │         │  Partial (0,1)
                                  ▼         ▼
             ┌─────────────────────────┐   ┌─────────────────────────┐
             │         LEARNER         │   │          TUTOR          │
             │ ----------------------- │   │ ----------------------- │
             │ target_cgpa             │   │ proficiency_score [der] │
             │ student_mode_last_seen  │   │ tutor_rank [der]        │
             │                         │   │                         │
             │ Relationships:          │   │ Relationships:          │
             │  - Asks DOUBT           │   │  - Certified_In SKILL   │
             │  - Plans TASK           │   │  - Locks/Books DOUBT    │
             │  - Rates in SESSION     │   │  - Teaches in SESSION   │
             │  - Owns RESOURCE_BUCKET │   │  - Evaluated in SNAPSHOT│
             └─────────────────────────┘   └─────────────────────────┘
```

- **Specialization Constraint**: **Overlapping `(o)`**. A student may simultaneously be a Learner and a Tutor.
- **Completeness Constraint**: **Partial Specialization** (single line). A newly onboarded student might not yet have posted a doubt or claimed tutoring skills.

---

### 3.2 Resource Hierarchy: Disjoint Specialization `(d)` & Full Connectivity

#### Clarification & Resolution on Resource Superclass Connectivity
> [!NOTE]
> **Why was the Resource superclass disconnected in earlier drafts?**  
> In initial rough sketches, the `RESOURCE` generalization hierarchy (`PDF`, `LINK`, `PHOTO`, `TEXT`) was drawn at the bottom of the canvas in isolation, omitting its relationship links to student owners and storage containers.  
> **The Architectural Resolution**: In [`PEERLEARN_CHEN_EER.drawio`](file:///c:/Users/vamsi/OneDrive/Desktop/peerlearn/PEERLEARN_CHEN_EER.drawio), `RESOURCE` is fully connected to the main schema via:
> 1. **Private Storage Route**: `STUDENT` `(0, N)` --- `[Owns_Bucket]` --- `(1, 1)` `RESOURCE_BUCKET` `(0, N)` --- `[Contains]` --- `(1, 1)` `RESOURCE`
> 2. **Direct File Ownership**: `STUDENT` `(0, N)` --- `[Uploads]` --- `(1, 1)` `RESOURCE`
> 3. **Shared Batch Repository**: `SHARED_RESOURCE_BUCKET` `(0, N)` --- `[Publishes]` --- `(1, 1)` `SHARED_RESOURCE` (with `created_by` linking to `STUDENT`).
> 4. **Democratic Peer Review Route**: `SHARED_RESOURCE_BUCKET` `(0, N)` --- `[Stages]` --- `(1, 1)` `RESOURCE_PROPOSAL` `(1, 1)` --- `[Receives_Vote]` --- `(0, N)` `RESOURCE_VOTE` `(0, N)` --- `[Casts_Ballot]` --- `(1, 1)` `STUDENT`.

```
                           ┌────────────────────────┐
                           │        RESOURCE        │ (Superclass)
                           │ ---------------------- │
                           │ <u>id</u> (PK)             │
                           │ title                  │
                           │ description            │
                           │ mime_type              │
                           │ size_bytes             │
                           │ created_at             │
                           └───────────┬────────────┘
                                       │
                                     [ d ]  Disjoint Specialization
                       ┌───────────┬───┴───────────┬───────────┐
                       │           │               │           │
                       ▼           ▼               ▼           ▼
                 ┌───────────┐┌───────────┐  ┌───────────┐┌───────────┐
                 │    PDF    ││   LINK    │  │   PHOTO   ││   TEXT    │
                 │-----------││-----------│  │-----------││-----------│
                 │storage_key││ext_url    │  │storage_key││text_body  │
                 └───────────┘└───────────┘  └───────────┘└───────────┘
```

- **Specialization Constraint**: **Disjoint `(d)`**. Every resource must be exactly one type: PDF, Hyperlink, Photo, or Text note.
- **Completeness Constraint**: **Total Specialization** (double line `===`).

---

## 4. Strong vs. Weak Entities & Identifying Relationships

Chen notation explicitly distinguishes between independent entities and existence-dependent entities:

### 4.1 Weak Entity Catalog

```
 Owner Strong Entity         Identifying Relationship           Weak Entity
 ───────────────────         ────────────────────────           ───────────
 [SESSION]          ═══════◇ ◈ Contains_Chat ◈   ══════════════ [SESSION_MESSAGE]
 [SESSION]          ═══════◇ ◈ Rated_In ◈        ══════════════ [SESSION_RATING]
 [STUDENT] (Tutor)  ═══════◇ ◈ Evaluated_By ◈    ══════════════ [TUTOR_SCORE_SNAPSHOT]
 [RESOURCE_PROPOSAL]═══════◇ ◈ Receives_Vote ◈   ══════════════ [RESOURCE_VOTE]
```

#### Detailed Weak Entity Characteristics:

1. **`SESSION_MESSAGE`** (Weak Entity — Double Rectangle)
   - **Identifying Parent**: `SESSION`
   - **Identifying Relationship**: `Contains_Chat` (Double Rhombus)
   - **Partial Key (Discriminator)**: - - - <u>created_at</u> - - -
   - **Semantics**: In-session chat messages exist only within the context of a live tutoring session room.

2. **`SESSION_RATING`** (Weak Entity — Double Rectangle)
   - **Identifying Parent**: `SESSION`
   - **Identifying Relationship**: `Rated_In` (Double Rhombus)
   - **Cardinality**: `(1, 1)` on session, `(0, 1)` on rating.
   - **Semantics**: Double-blind feedback evaluating a specific concluded tutoring session.

3. **`TUTOR_SCORE_SNAPSHOT`** (Weak Entity — Double Rectangle)
   - **Identifying Parent**: `STUDENT` (Tutor)
   - **Identifying Relationship**: `Evaluated_By` (Double Rhombus)
   - **Partial Key**: - - - <u>calculated_at</u> - - -
   - **Semantics**: Periodic weekly time-series measurement representing a tutor's multi-component performance.

4. **`RESOURCE_VOTE`** (Weak Entity — Double Rectangle)
   - **Identifying Parent**: `RESOURCE_PROPOSAL`
   - **Identifying Relationship**: `Receives_Vote` (Double Rhombus)
   - **Partial Key**: `voter_id`
   - **Semantics**: Ballots cast during a 24-hour review window for student-contributed shared materials.

> [!IMPORTANT]
> **Subtasks Clarification**: In accordance with the application's actual domain architecture, subtasks are **not** modeled as independent entities in the ER diagram. Tasks in PeerLearn are autonomous, atomic planner items managed directly by the student.

---

## 5. Attribute Taxonomy & Relationship Attributes

### 5.1 Key Attributes (Primary & Candidate Keys)
- `STUDENT`: <u>id</u> (Surrogate UUID), <u>roll_number</u> (Natural Candidate Key), <u>institute_email</u> (Candidate Key)
- `ACADEMIC_RECORD`: <u>id</u> (PK), Composite Candidate Key: (<u>roll_number</u>, <u>semester</u>)
- `SKILL`: <u>id</u> (PK), <u>slug</u> (UK), <u>name</u> (UK)
- `DOUBT`: <u>id</u> (PK)
- `SESSION`: <u>id</u> (PK)
- `TASK`: <u>id</u> (PK)
- `RESOURCE_BUCKET`: <u>id</u> (PK)
- `RESOURCE`: <u>id</u> (PK)
- `SHARED_RESOURCE_BUCKET`: <u>id</u> (PK)
- `RESOURCE_PROPOSAL`: <u>id</u> (PK)

### 5.2 Partial Keys / Discriminators
- `SESSION_MESSAGE`: - - <u>created_at</u> - -
- `TUTOR_SCORE_SNAPSHOT`: - - <u>calculated_at</u> - -

### 5.3 Multivalued Attributes
- `phone` (in `STUDENT`): Double oval. A student can record alternate mobile or WhatsApp numbers.

### 5.4 Derived / Computed Attributes
- `score` (in `TUTOR_SCORE_SNAPSHOT`): Dashed oval. Computed as:
  $$\text{Score} = 55\% \times \text{Rating} + 20\% \times \text{Doubts Solved} + 15\% \times \text{Activity} + 10\% \times \text{Resources}$$
- `rank` (in `TUTOR_SCORE_SNAPSHOT`): Dashed oval. Dynamic leaderboard ranking among active tutors.
- `upvotes_count` & `downvotes_count` (in `RESOURCE_PROPOSAL`): Dashed oval. Computed from aggregate of `RESOURCE_VOTE` records.

### 5.5 Composite Attributes
- `Student_Name`: Branching into `First_Name` and `Last_Name`.
- `Session_Time_Window`: Branching into `Scheduled_Start` and `Scheduled_End`.

### 5.6 Relationship Attributes (Attached to Rhombuses)
Attributes that describe the association itself are connected directly to the relationship diamond:

| Relationship Diamond | Attribute Oval | Data Type | Description |
|----------------------|----------------|-----------|-------------|
| **`Certified_In`** | `certified_at` | TIMESTAMPTZ | Timestamp when tutor claimed and verified proficiency in the skill. |
| **`Locks/Books`** | `booked_at` | TIMESTAMPTZ | Timestamp when the tutor reserved the doubt for a tutoring session. |
| **`Tagged_With`** | `tagged_at` | TIMESTAMPTZ | Timestamp when the doubt was tagged with the subject skill. |
| **`Schedules_Into`** | `scheduled_start` | TIMESTAMPTZ | Start datetime agreed for the live session. |
| **`Schedules_Into`** | `scheduled_end` | TIMESTAMPTZ | End datetime for the live session. |
| **`Schedules_Into`** | `mode` | TEXT | Mode of the session (`ONLINE` or `OFFLINE`). |
| **`Receives_Vote`** | `vote` | TEXT | Ballot decision (`APPROVE` or `REJECT`). |

---

## 6. Complete Relationship & Min-Max Cardinality Directory

Formal `(min, max)` notation specifies structural participation constraints on each edge:
- `min = 0`: Optional participation.
- `min = 1`: Mandatory participation.
- `max = 1`: Single association.
- `max = N`: Multiple associations.

| Entity 1 | Edge 1 (min, max) | Relationship (Rhombus) | Edge 2 (min, max) | Entity 2 | Relationship Attributes | Business Rule |
|----------|:-----------------:|------------------------|:-----------------:|----------|-------------------------|---------------|
| `STUDENT` | (1, 1) | ◇ **Verifies** ◇ | (1, 1) | `ACADEMIC_RECORD` | — | Every student profile is strictly verified against exactly one academic record for the semester. |
| `STUDENT` (Learner) | (0, N) | ◇ **Asks** ◇ | (1, 1) | `DOUBT` | — | A student may ask 0 or many doubts; every doubt must be asked by exactly 1 student. |
| `STUDENT` (Tutor) | (0, N) | ◇ **Locks / Books** ◇ | (0, 1) | `DOUBT` | `booked_at` | A tutor can book multiple doubts; an open doubt is not yet booked. |
| `DOUBT` | (1, N) | ◇ **Tagged_With** ◇ | (0, N) | `SKILL` | `tagged_at` | Every doubt must have at least 1 skill tag; a skill may label many doubts. |
| `STUDENT` (Tutor) | (0, N) | ◇ **Certified_In** ◇ | (0, N) | `SKILL` | `certified_at` | Tutor claims proficiency in subjects they can teach. |
| `DOUBT` | (0, 1) | ◈ **Schedules_Into** ◈ | (1, 1) | `SESSION` | `scheduled_start`, `scheduled_end`, `mode` | A booked doubt schedules exactly 1 session room. |
| `STUDENT` (Learner) | (0, N) | ◇ **Attends** ◇ | (1, 1) | `SESSION` | — | A student attends the tutoring session as the learner. |
| `STUDENT` (Tutor) | (0, N) | ◇ **Teaches** ◇ | (1, 1) | `SESSION` | — | A tutor conducts the tutoring session. |
| `SESSION` | (1, 1) | ◈ **Contains_Chat** ◈ | (0, N) | `SESSION_MESSAGE` | — | A live session contains 0 to many chat audit messages. |
| `SESSION` | (1, 1) | ◈ **Rated_In** ◈ | (0, 1) | `SESSION_RATING` | — | A completed session receives at most 1 double-blind rating. |
| `STUDENT` (Tutor) | (1, 1) | ◈ **Evaluated_By** ◈ | (0, N) | `TUTOR_SCORE_SNAPSHOT` | — | A tutor accumulates periodic performance snapshots. |
| `STUDENT` (Learner) | (0, N) | ◇ **Plans** ◇ | (1, 1) | `TASK` | — | A student plans personal academic tasks in their planner. |
| `STUDENT` | (0, N) | ◇ **Owns_Bucket** ◇ | (1, 1) | `RESOURCE_BUCKET` | — | A student organizes private materials into buckets/folders. |
| `RESOURCE_BUCKET` | (1, 1) | ◇ **Contains** ◇ | (0, N) | `RESOURCE` | — | A bucket holds uploaded study files and links. |
| `STUDENT` | (0, N) | ◇ **Uploads** ◇ | (1, 1) | `RESOURCE` | — | A student is the explicit owner/uploader of the resource. |
| `SHARED_RESOURCE_BUCKET` | (1, 1) | ◇ **Publishes** ◇ | (0, N) | `SHARED_RESOURCE` | — | Batch-level community folder holds approved materials. |
| `SHARED_RESOURCE_BUCKET` | (1, 1) | ◇ **Stages** ◇ | (0, N) | `RESOURCE_PROPOSAL` | — | Batch bucket holds proposals awaiting democratic vote. |
| `STUDENT` | (0, N) | ◇ **Proposes** ◇ | (1, 1) | `RESOURCE_PROPOSAL` | — | A student submits a proposed resource to the batch. |
| `RESOURCE_PROPOSAL` | (1, 1) | ◈ **Receives_Vote** ◈ | (0, N) | `RESOURCE_VOTE` | `vote` | A proposal collects ballots during 24h voting window. |
| `STUDENT` | (0, N) | ◇ **Casts_Ballot** ◇ | (1, 1) | `RESOURCE_VOTE` | — | A student casts a ballot on a community proposal. |

---

## 7. Chen ER Diagram in Graphviz DOT & PlantUML

Paste this code directly into Draw.io (**Arrange → Insert → Advanced → PlantUML...**):

```plantuml
@startuml PeerLearn_Chen_EER
!theme plain
skinparam roundcorner 10
skinparam linetype ortho

' --- ENTITIES (Rectangles) ---
rectangle "STUDENT\n(Superclass)" as student #dae8fc;line:6c8ebf;text:black
rectangle "LEARNER\n(Subclass)" as learner #dae8fc;line:6c8ebf;text:black
rectangle "TUTOR\n(Subclass)" as tutor #dae8fc;line:6c8ebf;text:black
circle "( o )" as spec_student #e1d5e7;line:9673a6;text:black

rectangle "ACADEMIC_RECORD\n(Audit Registry)" as acad_record #fad7ac;line:b46504;text:black
rectangle "SKILL\n(Subject Domain)" as skill #d5e8d4;line:82b366;text:black
rectangle "DOUBT\n(Academic Query)" as doubt #ffe6cc;line:d79b00;text:black
rectangle "SESSION\n(Live Room)" as session #fff2cc;line:d6b656;text:black
rectangle "TASK\n(Academic Goal)" as task #f8cecc;line:b85450;text:black
rectangle "RESOURCE_BUCKET\n(Private Folder)" as r_bucket #f5f5f5;line:666666;text:black
rectangle "RESOURCE\n(File Superclass)" as resource #f5f5f5;line:666666;text:black
rectangle "SHARED_RESOURCE_BUCKET\n(Batch Catalog)" as s_bucket #bac8d3;line:23445d;text:black
rectangle "RESOURCE_PROPOSAL\n(Staged Item)" as proposal #b0e3e6;line:0e8088;text:black

' --- WEAK ENTITIES (Double Rectangles) ---
rectangle "SESSION_MESSAGE\n[[ WEAK ENTITY ]]" as message #fff2cc;line:d6b656;line.bold;text:black
rectangle "SESSION_RATING\n[[ WEAK ENTITY ]]" as rating #e1d5e7;line:9673a6;line.bold;text:black
rectangle "TUTOR_SCORE_SNAPSHOT\n[[ WEAK ENTITY ]]" as score_snap #e1d5e7;line:9673a6;line.bold;text:black
rectangle "RESOURCE_VOTE\n[[ WEAK ENTITY ]]" as vote #b0e3e6;line:0e8088;line.bold;text:black

' --- RELATIONSHIPS (Diamonds) ---
diamond "Verifies" as rel_verifies #fad7ac;line:b46504
diamond "Asks" as rel_asks #ffe6cc;line:d79b00
diamond "Locks / Books" as rel_locks #ffe6cc;line:d79b00
diamond "Tagged_With" as rel_tags #d5e8d4;line:82b366
diamond "Certified_In" as rel_cert #d5e8d4;line:82b366
diamond "Plans" as rel_plans #f8cecc;line:b85450
diamond "Teaches" as rel_teaches #fff2cc;line:d6b656
diamond "Owns_Bucket" as rel_owns_b #f5f5f5;line:666666
diamond "Contains" as rel_contains #f5f5f5;line:666666
diamond "Uploads" as rel_uploads #f5f5f5;line:666666
diamond "Stages" as rel_stages #b0e3e6;line:0e8088
diamond "Proposes" as rel_proposes #b0e3e6;line:0e8088

' --- IDENTIFYING RELATIONSHIPS (Double Diamonds) ---
diamond "Schedules_Into\n[[ IDENTIFYING ]]" as id_sched #ffe6cc;line:d79b00;line.bold
diamond "Contains_Chat\n[[ IDENTIFYING ]]" as id_chat #fff2cc;line:d6b656;line.bold
diamond "Rated_In\n[[ IDENTIFYING ]]" as id_rating #e1d5e7;line:9673a6;line.bold
diamond "Evaluated_By\n[[ IDENTIFYING ]]" as id_eval #e1d5e7;line:9673a6;line.bold
diamond "Receives_Vote\n[[ IDENTIFYING ]]" as id_vote #b0e3e6;line:0e8088;line.bold

' --- RELATIONSHIP ATTRIBUTES ---
ellipse "certified_at" as att_cert_at #d5e8d4;line:82b366
rel_cert --- att_cert_at

ellipse "booked_at" as att_book_at #ffe6cc;line:d79b00
rel_locks --- att_book_at

ellipse "tagged_at" as att_tag_at #d5e8d4;line:82b366
rel_tags --- att_tag_at

ellipse "scheduled_start" as att_start #fff2cc;line:d6b656
ellipse "scheduled_end" as att_end #fff2cc;line:d6b656
ellipse "mode" as att_mode #fff2cc;line:d6b656
id_sched --- att_start
id_sched --- att_end
id_sched --- att_mode

ellipse "vote" as att_vote_choice #b0e3e6;line:0e8088
id_vote --- att_vote_choice

' --- CONNECTIONS WITH MIN-MAX ---
student "(1,1)" --- rel_verifies
rel_verifies --- "(1,1)" acad_record

student --- spec_student
spec_student --> learner : "IS-A"
spec_student --> tutor : "IS-A"

learner "(0,N)" --- rel_asks
rel_asks --- "(1,1)" doubt

tutor "(0,N)" --- rel_locks
rel_locks --- "(0,1)" doubt

doubt "(1,N)" --- rel_tags
rel_tags --- "(0,N)" skill

tutor "(0,N)" --- rel_cert
rel_cert --- "(0,N)" skill

doubt "(0,1)" === id_sched
id_sched === "(1,1)" session

tutor "(0,N)" --- rel_teaches
rel_teaches --- "(1,1)" session

session "(1,1)" === id_chat
id_chat === "(0,N)" message

session "(1,1)" === id_rating
id_rating === "(0,1)" rating

tutor "(1,1)" === id_eval
id_eval === "(0,N)" score_snap

learner "(0,N)" --- rel_plans
rel_plans --- "(1,1)" task

learner "(0,N)" --- rel_owns_b
rel_owns_b --- "(1,1)" r_bucket

r_bucket "(0,N)" --- rel_contains
rel_contains --- "(1,1)" resource

student "(0,N)" --- rel_uploads
rel_uploads --- "(1,1)" resource

s_bucket "(1,1)" --- rel_stages
rel_stages --- "(0,N)" proposal

student "(0,N)" --- rel_proposes
rel_proposes --- "(1,1)" proposal

proposal "(1,1)" === id_vote
id_vote === "(0,N)" vote

@enduml
```

---

## 8. Draw.io Native XML for Chen EER Diagram

We have created and verified the companion diagram file [`PEERLEARN_CHEN_EER.drawio`](file:///c:/Users/vamsi/OneDrive/Desktop/peerlearn/PEERLEARN_CHEN_EER.drawio) in the root directory. You can open it directly in Draw.io or paste the complete XML specification below via **Arrange → Insert → Advanced → XML...**:

```xml
<mxfile host="app.diagrams.net" modified="2026-11-02T18:30:00.000Z" agent="Antigravity AI" version="24.0.0" type="device">
  <diagram id="peerlearn-chen-eer-v2" name="PeerLearn Chen & EER Conceptual Diagram">
    <mxGraphModel dx="4800" dy="3800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="4800" pageHeight="3600" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- ============================================================= -->
        <!-- ZONE 1: NOTATION LEGEND (TOP-LEFT)                            -->
        <!-- ============================================================= -->
        <mxCell id="legend_box" value="&lt;b style=&quot;font-size:14px;&quot;&gt;PETER CHEN &amp;amp; ENHANCED ER (EER) LEGEND&lt;/b&gt;&lt;hr/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;&lt;br/&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8f9fa;strokeColor=#495057;fontColor=#212529;verticalAlign=top;align=left;spacingLeft=18;spacingTop=16;shadow=1;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="60" y="60" width="480" height="740" as="geometry" />
        </mxCell>

        <!-- Strong Entity -->
        <mxCell id="leg_ent_strong" value="Strong Entity" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;fillColor=#dae8fc;strokeColor=#6c8ebf;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="85" y="110" width="130" height="36" as="geometry" />
        </mxCell>
        <mxCell id="leg_desc_strong" value="Autonomous table with independent PK" style="text;html=1;fontSize=11;align=left;verticalAlign=middle;" vertex="1" parent="1">
          <mxGeometry x="230" y="110" width="280" height="36" as="geometry" />
        </mxCell>

        <!-- Weak Entity -->
        <mxCell id="leg_ent_weak" value="Weak Entity" style="shape=ext;double=1;rounded=0;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2.5;" vertex="1" parent="1">
          <mxGeometry x="85" y="160" width="130" height="36" as="geometry" />
        </mxCell>
        <mxCell id="leg_desc_weak" value="Existence-dependent entity (cascade deletion)" style="text;html=1;fontSize=11;align=left;verticalAlign=middle;" vertex="1" parent="1">
          <mxGeometry x="230" y="160" width="280" height="36" as="geometry" />
        </mxCell>

        <!-- Regular Relationship -->
        <mxCell id="leg_rel_reg" value="Relationship" style="shape=rhombus;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;fillColor=#d5e8d4;strokeColor=#82b366;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="85" y="210" width="130" height="42" as="geometry" />
        </mxCell>
        <mxCell id="leg_desc_rel" value="Regular relationship (Solid Diamond)" style="text;html=1;fontSize=11;align=left;verticalAlign=middle;" vertex="1" parent="1">
          <mxGeometry x="230" y="210" width="280" height="42" as="geometry" />
        </mxCell>

        <!-- Identifying Relationship -->
        <mxCell id="leg_rel_id" value="Identifying" style="shape=rhombus;double=1;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;fillColor=#ffe6cc;strokeColor=#d79b00;strokeWidth=2.5;" vertex="1" parent="1">
          <mxGeometry x="85" y="265" width="130" height="42" as="geometry" />
        </mxCell>
        <mxCell id="leg_desc_id" value="Identifying relationship (Double Diamond)" style="text;html=1;fontSize=11;align=left;verticalAlign=middle;" vertex="1" parent="1">
          <mxGeometry x="230" y="265" width="280" height="42" as="geometry" />
        </mxCell>

        <!-- Relationship Attribute -->
        <mxCell id="leg_rel_attr" value="rel_attribute" style="ellipse;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;strokeWidth=1.5;fontSize=11;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="85" y="320" width="130" height="32" as="geometry" />
        </mxCell>
        <mxCell id="leg_desc_rel_attr" value="Attribute belonging to a relationship" style="text;html=1;fontSize=11;align=left;verticalAlign=middle;" vertex="1" parent="1">
          <mxGeometry x="230" y="320" width="280" height="32" as="geometry" />
        </mxCell>

        <!-- Primary Key Attribute -->
        <mxCell id="leg_att_pk" value="&lt;u&gt;primary_key&lt;/u&gt;" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="85" y="365" width="130" height="32" as="geometry" />
        </mxCell>
        <mxCell id="leg_desc_pk" value="Primary key (Underlined oval)" style="text;html=1;fontSize=11;align=left;verticalAlign=middle;" vertex="1" parent="1">
          <mxGeometry x="230" y="365" width="280" height="32" as="geometry" />
        </mxCell>

        <!-- Partial Key Attribute -->
        <mxCell id="leg_att_part" value="- - &lt;u&gt;partial_key&lt;/u&gt; - -" style="ellipse;whiteSpace=wrap;html=1;dashed=1;strokeColor=#d6b656;fillColor=#fff2cc;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="85" y="410" width="130" height="32" as="geometry" />
        </mxCell>
        <mxCell id="leg_desc_part" value="Partial key / Discriminator for weak entity" style="text;html=1;fontSize=11;align=left;verticalAlign=middle;" vertex="1" parent="1">
          <mxGeometry x="230" y="410" width="280" height="32" as="geometry" />
        </mxCell>

        <!-- Multivalued Attribute -->
        <mxCell id="leg_att_multi" value="multivalued" style="shape=doubleEllipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;strokeWidth=2;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="85" y="455" width="130" height="32" as="geometry" />
        </mxCell>
        <mxCell id="leg_desc_multi" value="Multivalued attribute (Double oval)" style="text;html=1;fontSize=11;align=left;verticalAlign=middle;" vertex="1" parent="1">
          <mxGeometry x="230" y="455" width="280" height="32" as="geometry" />
        </mxCell>

        <!-- Derived Attribute -->
        <mxCell id="leg_att_der" value="- - ( derived ) - -" style="ellipse;whiteSpace=wrap;html=1;dashed=1;strokeColor=#b85450;fillColor=#f8cecc;strokeWidth=2;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="85" y="500" width="130" height="32" as="geometry" />
        </mxCell>
        <mxCell id="leg_desc_der" value="Derived / Calculated attribute (Dashed oval)" style="text;html=1;fontSize=11;align=left;verticalAlign=middle;" vertex="1" parent="1">
          <mxGeometry x="230" y="500" width="280" height="32" as="geometry" />
        </mxCell>

        <!-- Specialization Overlapping -->
        <mxCell id="leg_spec_o" value="o" style="ellipse;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;strokeWidth=2.5;fontStyle=1;fontSize=14;" vertex="1" parent="1">
          <mxGeometry x="130" y="545" width="40" height="40" as="geometry" />
        </mxCell>
        <mxCell id="leg_desc_o" value="Overlapping specialization circle (can be both)" style="text;html=1;fontSize=11;align=left;verticalAlign=middle;" vertex="1" parent="1">
          <mxGeometry x="230" y="545" width="280" height="40" as="geometry" />
        </mxCell>

        <!-- Specialization Disjoint -->
        <mxCell id="leg_spec_d" value="d" style="ellipse;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;strokeWidth=2.5;fontStyle=1;fontSize=14;" vertex="1" parent="1">
          <mxGeometry x="130" y="600" width="40" height="40" as="geometry" />
        </mxCell>
        <mxCell id="leg_desc_d" value="Disjoint specialization circle (mutually exclusive)" style="text;html=1;fontSize=11;align=left;verticalAlign=middle;" vertex="1" parent="1">
          <mxGeometry x="230" y="600" width="280" height="40" as="geometry" />
        </mxCell>

        <!-- Min-Max Notation Description -->
        <mxCell id="leg_minmax_box" value="&lt;b&gt;MIN-MAX CARDINALITY NOTATION:&lt;/b&gt;&lt;br/&gt;Each edge connecting an Entity to a Relationship is annotated with &lt;b&gt;(min, max)&lt;/b&gt;:&lt;br/&gt;• &lt;b&gt;(0, 1)&lt;/b&gt; = Optional, at most one&lt;br/&gt;• &lt;b&gt;(1, 1)&lt;/b&gt; = Mandatory, exactly one (Total participation)&lt;br/&gt;• &lt;b&gt;(0, N)&lt;/b&gt; = Optional, zero or many&lt;br/&gt;• &lt;b&gt;(1, N)&lt;/b&gt; = Mandatory, at least one (Total participation)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#adb5bd;fontSize=11;align=left;verticalAlign=top;spacingLeft=10;spacingTop=8;" vertex="1" parent="1">
          <mxGeometry x="85" y="655" width="430" height="125" as="geometry" />
        </mxCell>


        <!-- ============================================================= -->
        <!-- ZONE 2: ACADEMIC_RECORD & VERIFICATION (TOP-CENTER)           -->
        <!-- ============================================================= -->
        <mxCell id="ent_acad" value="ACADEMIC_RECORD&#xa;(Authoritative Registry)" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=14;align=center;verticalAlign=middle;fillColor=#dae8fc;strokeColor=#6c8ebf;strokeWidth=2.5;shadow=1;" vertex="1" parent="1">
          <mxGeometry x="1900" y="80" width="240" height="65" as="geometry" />
        </mxCell>

        <!-- Academic Record Attributes -->
        <mxCell id="att_acad_roll" value="&lt;u&gt;roll_number&lt;/u&gt; (CPK)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="1650" y="40" width="125" height="38" as="geometry" />
        </mxCell>
        <mxCell id="att_acad_sem" value="&lt;u&gt;semester&lt;/u&gt; (CPK)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="1650" y="90" width="125" height="38" as="geometry" />
        </mxCell>
        <mxCell id="att_acad_cpi" value="cpi" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="1790" y="20" width="90" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_acad_cgpa" value="cgpa" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="1900" y="20" width="90" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_acad_credits" value="credits" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="2010" y="20" width="90" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_acad_batch" value="batch" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="2120" y="20" width="90" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_acad_prog" value="programme" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="2260" y="40" width="100" height="38" as="geometry" />
        </mxCell>
        <mxCell id="att_acad_dept" value="department" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="2260" y="90" width="100" height="38" as="geometry" />
        </mxCell>

        <mxCell id="e_acad_roll" edge="1" parent="1" source="ent_acad" target="att_acad_roll" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_acad_sem" edge="1" parent="1" source="ent_acad" target="att_acad_sem" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_acad_cpi" edge="1" parent="1" source="ent_acad" target="att_acad_cpi" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_acad_cgpa" edge="1" parent="1" source="ent_acad" target="att_acad_cgpa" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_acad_credits" edge="1" parent="1" source="ent_acad" target="att_acad_credits" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_acad_batch" edge="1" parent="1" source="ent_acad" target="att_acad_batch" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_acad_prog" edge="1" parent="1" source="ent_acad" target="att_acad_prog" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_acad_dept" edge="1" parent="1" source="ent_acad" target="att_acad_dept" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <!-- Relationship: Verifies (1:1) -->
        <mxCell id="rel_verifies" value="Verifies" style="shape=rhombus;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#dae8fc;strokeColor=#6c8ebf;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1950" y="190" width="140" height="60" as="geometry" />
        </mxCell>
        <mxCell id="e_acad_ver" edge="1" parent="1" source="ent_acad" target="rel_verifies" style="endArrow=none;strokeColor=#6c8ebf;strokeWidth=2;">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="lbl_acad_ver" value="(0, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#1f497d;" vertex="1" connectable="0" parent="e_acad_ver">
          <mxGeometry x="-0.3" relative="1" as="geometry"><mxPoint x="18" y="0"/></mxGeometry>
        </mxCell>

        <mxCell id="e_ver_stud" edge="1" parent="1" source="rel_verifies" target="ent_student" style="endArrow=none;strokeColor=#6c8ebf;strokeWidth=2;">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="lbl_ver_stud" value="(1, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#1f497d;" vertex="1" connectable="0" parent="e_ver_stud">
          <mxGeometry x="0.3" relative="1" as="geometry"><mxPoint x="18" y="0"/></mxGeometry>
        </mxCell>


        <!-- ============================================================= -->
        <!-- ZONE 3: CORE SUPERCLASS STUDENT (UPPER-CENTER)                -->
        <!-- ============================================================= -->
        <mxCell id="ent_student" value="STUDENT&#xa;(Superclass)" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=16;align=center;verticalAlign=middle;fillColor=#dae8fc;strokeColor=#6c8ebf;strokeWidth=3;shadow=1;" vertex="1" parent="1">
          <mxGeometry x="1890" y="300" width="260" height="75" as="geometry" />
        </mxCell>

        <!-- Student Attributes (Left side) -->
        <mxCell id="att_s_id" value="&lt;u&gt;id&lt;/u&gt; (PK)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="1560" y="240" width="100" height="38" as="geometry" />
        </mxCell>
        <mxCell id="att_s_roll" value="&lt;u&gt;roll_number&lt;/u&gt; (UK)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="1550" y="290" width="125" height="38" as="geometry" />
        </mxCell>
        <mxCell id="att_s_email" value="&lt;u&gt;institute_email&lt;/u&gt; (UK)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=10;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="1540" y="340" width="135" height="38" as="geometry" />
        </mxCell>
        <mxCell id="att_s_pemail" value="personal_email" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="1550" y="390" width="120" height="36" as="geometry" />
        </mxCell>

        <!-- Student Attributes (Right side) -->
        <mxCell id="att_s_name" value="full_name" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="2350" y="240" width="100" height="36" as="geometry" />
        </mxCell>
        <mxCell id="att_s_dept" value="department" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="2350" y="285" width="105" height="36" as="geometry" />
        </mxCell>
        <mxCell id="att_s_prog" value="programme" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="2350" y="330" width="105" height="36" as="geometry" />
        </mxCell>
        <mxCell id="att_s_year" value="year_of_study" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="2350" y="375" width="110" height="36" as="geometry" />
        </mxCell>
        <mxCell id="att_s_phone" value="phone&#xa;(( Multivalued ))" style="shape=doubleEllipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;strokeWidth=2;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="2350" y="420" width="115" height="42" as="geometry" />
        </mxCell>

        <!-- Connectors: Student to Attributes -->
        <mxCell id="e_s_id" edge="1" parent="1" source="ent_student" target="att_s_id" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_s_roll" edge="1" parent="1" source="ent_student" target="att_s_roll" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_s_email" edge="1" parent="1" source="ent_student" target="att_s_email" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_s_pemail" edge="1" parent="1" source="ent_student" target="att_s_pemail" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_s_name" edge="1" parent="1" source="ent_student" target="att_s_name" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_s_dept" edge="1" parent="1" source="ent_student" target="att_s_dept" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_s_prog" edge="1" parent="1" source="ent_student" target="att_s_prog" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_s_year" edge="1" parent="1" source="ent_student" target="att_s_year" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_s_phone" edge="1" parent="1" source="ent_student" target="att_s_phone" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>


        <!-- ============================================================= -->
        <!-- ZONE 4: OVERLAPPING SPECIALIZATION (o) -> LEARNER & TUTOR     -->
        <!-- ============================================================= -->
        <mxCell id="spec_student" value="o" style="ellipse;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;strokeWidth=2.5;fontStyle=1;fontSize=16;" vertex="1" parent="1">
          <mxGeometry x="2000" y="440" width="40" height="40" as="geometry" />
        </mxCell>
        <mxCell id="e_spec_link" edge="1" parent="1" source="ent_student" target="spec_student" style="endArrow=none;strokeColor=#9673a6;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <!-- Subclass 1: LEARNER -->
        <mxCell id="ent_learner" value="LEARNER&#xa;(Subclass)" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=14;align=center;verticalAlign=middle;fillColor=#dae8fc;strokeColor=#6c8ebf;strokeWidth=2.5;" vertex="1" parent="1">
          <mxGeometry x="1350" y="550" width="180" height="60" as="geometry" />
        </mxCell>
        <mxCell id="att_lrn_cgpa" value="target_cgpa" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="1190" y="540" width="95" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_lrn_mode" value="student_mode_last_seen" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="1150" y="585" width="145" height="35" as="geometry" />
        </mxCell>
        <mxCell id="e_lrn_cgpa" edge="1" parent="1" source="ent_learner" target="att_lrn_cgpa" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_lrn_mode" edge="1" parent="1" source="ent_learner" target="att_lrn_mode" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <!-- Subclass 2: TUTOR -->
        <mxCell id="ent_tutor" value="TUTOR&#xa;(Subclass)" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=14;align=center;verticalAlign=middle;fillColor=#dae8fc;strokeColor=#6c8ebf;strokeWidth=2.5;" vertex="1" parent="1">
          <mxGeometry x="2520" y="550" width="180" height="60" as="geometry" />
        </mxCell>

        <mxCell id="e_spec_learner" edge="1" parent="1" source="spec_student" target="ent_learner" style="endArrow=block;endFill=0;strokeColor=#9673a6;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_spec_tutor" edge="1" parent="1" source="spec_student" target="ent_tutor" style="endArrow=block;endFill=0;strokeColor=#9673a6;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>


        <!-- ============================================================= -->
        <!-- ZONE 5: SKILLS & CERTIFICATION (FAR RIGHT)                    -->
        <!-- ============================================================= -->
        <mxCell id="ent_skill" value="SKILL&#xa;(Subject Catalog)" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=14;align=center;verticalAlign=middle;fillColor=#d5e8d4;strokeColor=#82b366;strokeWidth=2.5;shadow=1;" vertex="1" parent="1">
          <mxGeometry x="3400" y="550" width="200" height="65" as="geometry" />
        </mxCell>

        <!-- Skill Attributes -->
        <mxCell id="att_sk_id" value="&lt;u&gt;id&lt;/u&gt; (PK)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="3660" y="515" width="90" height="38" as="geometry" />
        </mxCell>
        <mxCell id="att_sk_name" value="&lt;u&gt;name&lt;/u&gt; (UK)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="3660" y="560" width="100" height="38" as="geometry" />
        </mxCell>
        <mxCell id="att_sk_slug" value="slug" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="3660" y="605" width="85" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_sk_cat" value="category" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="3660" y="650" width="90" height="35" as="geometry" />
        </mxCell>

        <mxCell id="e_sk_id" edge="1" parent="1" source="ent_skill" target="att_sk_id" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_sk_name" edge="1" parent="1" source="ent_skill" target="att_sk_name" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_sk_slug" edge="1" parent="1" source="ent_skill" target="att_sk_slug" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_sk_cat" edge="1" parent="1" source="ent_skill" target="att_sk_cat" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <!-- Tutor Pro Skills Relationship (Certified_In) -->
        <mxCell id="rel_certified" value="Certified_In" style="shape=rhombus;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#d5e8d4;strokeColor=#82b366;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="2950" y="545" width="160" height="70" as="geometry" />
        </mxCell>
        <mxCell id="att_rel_cert_at" value="certified_at" style="ellipse;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;strokeWidth=1.5;fontSize=10;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="2980" y="480" width="100" height="34" as="geometry" />
        </mxCell>
        <mxCell id="e_cert_attr" edge="1" parent="1" source="rel_certified" target="att_rel_cert_at" style="endArrow=none;strokeColor=#9673a6;strokeWidth=1.5;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <mxCell id="e_tutor_cert" edge="1" parent="1" source="ent_tutor" target="rel_certified" style="endArrow=none;strokeColor=#82b366;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_tutor_cert" value="(1, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#274e13;" vertex="1" connectable="0" parent="e_tutor_cert">
          <mxGeometry x="-0.3" relative="1" as="geometry"><mxPoint x="12" y="-12"/></mxGeometry>
        </mxCell>

        <mxCell id="e_cert_skill" edge="1" parent="1" source="rel_certified" target="ent_skill" style="endArrow=none;strokeColor=#82b366;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_cert_skill" value="(0, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#274e13;" vertex="1" connectable="0" parent="e_cert_skill">
          <mxGeometry x="0.3" relative="1" as="geometry"><mxPoint x="-12" y="-12"/></mxGeometry>
        </mxCell>


        <!-- ============================================================= -->
        <!-- ZONE 6: DOUBTS, ASKING, LOCKING & TAGGING (LEFT & CENTER-LEFT)-->
        <!-- ============================================================= -->
        <!-- Asks Relationship: LEARNER -> DOUBT -->
        <mxCell id="rel_asks" value="Asks" style="shape=rhombus;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#ffe6cc;strokeColor=#d79b00;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1000" y="730" width="140" height="65" as="geometry" />
        </mxCell>
        <mxCell id="e_lrn_asks" edge="1" parent="1" source="ent_learner" target="rel_asks" style="endArrow=none;strokeColor=#d79b00;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_lrn_asks" value="(0, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#b45f06;" vertex="1" connectable="0" parent="e_lrn_asks">
          <mxGeometry x="-0.3" relative="1" as="geometry"><mxPoint x="-14" y="10"/></mxGeometry>
        </mxCell>

        <!-- Entity DOUBT -->
        <mxCell id="ent_doubt" value="DOUBT&#xa;(Academic Query)" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=14;align=center;verticalAlign=middle;fillColor=#ffe6cc;strokeColor=#d79b00;strokeWidth=2.5;shadow=1;" vertex="1" parent="1">
          <mxGeometry x="960" y="870" width="220" height="70" as="geometry" />
        </mxCell>
        <mxCell id="e_asks_doubt" edge="1" parent="1" source="rel_asks" target="ent_doubt" style="endArrow=none;strokeColor=#d79b00;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_asks_doubt" value="(1, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#b45f06;" vertex="1" connectable="0" parent="e_asks_doubt">
          <mxGeometry x="0.3" relative="1" as="geometry"><mxPoint x="14" y="0"/></mxGeometry>
        </mxCell>

        <!-- Doubt Attributes -->
        <mxCell id="att_d_id" value="&lt;u&gt;id&lt;/u&gt; (PK)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="720" y="810" width="90" height="38" as="geometry" />
        </mxCell>
        <mxCell id="att_d_status" value="status" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="720" y="855" width="85" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_d_desc" value="description" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="720" y="900" width="95" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_d_outcome" value="expected_outcome" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="720" y="945" width="115" height="36" as="geometry" />
        </mxCell>
        <mxCell id="att_d_expires" value="expires_at" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="720" y="990" width="95" height="35" as="geometry" />
        </mxCell>

        <mxCell id="e_d_id" edge="1" parent="1" source="ent_doubt" target="att_d_id" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_d_status" edge="1" parent="1" source="ent_doubt" target="att_d_status" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_d_desc" edge="1" parent="1" source="ent_doubt" target="att_d_desc" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_d_outcome" edge="1" parent="1" source="ent_doubt" target="att_d_outcome" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_d_expires" edge="1" parent="1" source="ent_doubt" target="att_d_expires" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <!-- Tutor Locks/Books Doubt -->
        <mxCell id="rel_books" value="Locks / Books" style="shape=rhombus;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#ffe6cc;strokeColor=#d79b00;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1780" y="730" width="160" height="70" as="geometry" />
        </mxCell>
        <mxCell id="att_rel_book_at" value="booked_at" style="ellipse;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;strokeWidth=1.5;fontSize=10;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="1815" y="670" width="90" height="34" as="geometry" />
        </mxCell>
        <mxCell id="e_book_attr" edge="1" parent="1" source="rel_books" target="att_rel_book_at" style="endArrow=none;strokeColor=#9673a6;strokeWidth=1.5;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <mxCell id="e_tutor_books" edge="1" parent="1" source="ent_tutor" target="rel_books" style="endArrow=none;strokeColor=#d79b00;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_tutor_books" value="(0, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#b45f06;" vertex="1" connectable="0" parent="e_tutor_books">
          <mxGeometry x="-0.3" relative="1" as="geometry"><mxPoint x="-15" y="10"/></mxGeometry>
        </mxCell>

        <mxCell id="e_books_doubt" edge="1" parent="1" source="rel_books" target="ent_doubt" style="endArrow=none;strokeColor=#d79b00;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_books_doubt" value="(0, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#b45f06;" vertex="1" connectable="0" parent="e_books_doubt">
          <mxGeometry x="0.3" relative="1" as="geometry"><mxPoint x="15" y="10"/></mxGeometry>
        </mxCell>

        <!-- Doubt Tags (Relationship: Tagged_With to SKILL) -->
        <mxCell id="rel_tags" value="Tagged_With" style="shape=rhombus;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#d5e8d4;strokeColor=#82b366;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="2200" y="870" width="160" height="70" as="geometry" />
        </mxCell>
        <mxCell id="att_rel_tag_at" value="tagged_at" style="ellipse;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;strokeWidth=1.5;fontSize=10;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="2235" y="810" width="90" height="34" as="geometry" />
        </mxCell>
        <mxCell id="e_tag_attr" edge="1" parent="1" source="rel_tags" target="att_rel_tag_at" style="endArrow=none;strokeColor=#9673a6;strokeWidth=1.5;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <mxCell id="e_doubt_tags" edge="1" parent="1" source="ent_doubt" target="rel_tags" style="endArrow=none;strokeColor=#82b366;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_doubt_tags" value="(1, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#274e13;" vertex="1" connectable="0" parent="e_doubt_tags">
          <mxGeometry x="-0.3" relative="1" as="geometry"><mxPoint x="-15" y="-12"/></mxGeometry>
        </mxCell>

        <mxCell id="e_tags_skill" edge="1" parent="1" source="rel_tags" target="ent_skill" style="endArrow=none;strokeColor=#82b366;strokeWidth=2;"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="3450" y="905"/></Array></mxGeometry></mxCell>
        <mxCell id="lbl_tags_skill" value="(0, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#274e13;" vertex="1" connectable="0" parent="e_tags_skill">
          <mxGeometry x="0.8" relative="1" as="geometry"><mxPoint x="-20" y="15"/></mxGeometry>
        </mxCell>


        <!-- ============================================================= -->
        <!-- ZONE 7: STUDY PLANNER TASKS (CENTER, SPACED OUT)              -->
        <!-- ============================================================= -->
        <!-- Relationship Plans: LEARNER -> TASK -->
        <mxCell id="rel_plans" value="Plans" style="shape=rhombus;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#f8cecc;strokeColor=#b85450;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1440" y="730" width="140" height="65" as="geometry" />
        </mxCell>
        <mxCell id="e_lrn_plans" edge="1" parent="1" source="ent_learner" target="rel_plans" style="endArrow=none;strokeColor=#b85450;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_lrn_plans" value="(0, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#783f04;" vertex="1" connectable="0" parent="e_lrn_plans">
          <mxGeometry x="-0.3" relative="1" as="geometry"><mxPoint x="12" y="10"/></mxGeometry>
        </mxCell>

        <!-- Entity TASK -->
        <mxCell id="ent_task" value="TASK&#xa;(Academic Planner)" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=14;align=center;verticalAlign=middle;fillColor=#f8cecc;strokeColor=#b85450;strokeWidth=2.5;shadow=1;" vertex="1" parent="1">
          <mxGeometry x="1410" y="870" width="200" height="70" as="geometry" />
        </mxCell>
        <mxCell id="e_plans_task" edge="1" parent="1" source="rel_plans" target="ent_task" style="endArrow=none;strokeColor=#b85450;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_plans_task" value="(1, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#783f04;" vertex="1" connectable="0" parent="e_plans_task">
          <mxGeometry x="0.3" relative="1" as="geometry"><mxPoint x="14" y="0"/></mxGeometry>
        </mxCell>

        <!-- Task Attributes -->
        <mxCell id="att_t_id" value="&lt;u&gt;id&lt;/u&gt; (PK)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="1650" y="820" width="90" height="36" as="geometry" />
        </mxCell>
        <mxCell id="att_t_title" value="title" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="1650" y="865" width="85" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_t_context" value="context" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="1650" y="910" width="85" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_t_due" value="due_at" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="1650" y="955" width="85" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_t_priority" value="priority" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="1650" y="1000" width="85" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_t_status" value="status" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="1540" y="1010" width="85" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_t_tough" value="is_tough" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="1430" y="1010" width="85" height="35" as="geometry" />
        </mxCell>

        <mxCell id="e_t_id" edge="1" parent="1" source="ent_task" target="att_t_id" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_t_title" edge="1" parent="1" source="ent_task" target="att_t_title" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_t_context" edge="1" parent="1" source="ent_task" target="att_t_context" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_t_due" edge="1" parent="1" source="ent_task" target="att_t_due" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_t_priority" edge="1" parent="1" source="ent_task" target="att_t_priority" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_t_status" edge="1" parent="1" source="ent_task" target="att_t_status" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_t_tough" edge="1" parent="1" source="ent_task" target="att_t_tough" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>


        <!-- ============================================================= -->
        <!-- ZONE 8: TUTOR SCORE SNAPSHOT (WEAK ENTITY, FAR RIGHT)         -->
        <!-- ============================================================= -->
        <mxCell id="rel_score" value="Evaluated_By" style="shape=rhombus;double=1;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#e1d5e7;strokeColor=#9673a6;strokeWidth=2.5;" vertex="1" parent="1">
          <mxGeometry x="2700" y="730" width="160" height="70" as="geometry" />
        </mxCell>
        <mxCell id="e_tutor_score" edge="1" parent="1" source="ent_tutor" target="rel_score" style="endArrow=none;strokeColor=#9673a6;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_tutor_score" value="(0, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#4c1130;" vertex="1" connectable="0" parent="e_tutor_score">
          <mxGeometry x="-0.3" relative="1" as="geometry"><mxPoint x="12" y="10"/></mxGeometry>
        </mxCell>

        <mxCell id="ent_score_snap" value="TUTOR_SCORE_SNAPSHOT&#xa;[[ WEAK ENTITY ]]" style="shape=ext;double=1;rounded=0;whiteSpace=wrap;html=1;fontStyle=1;fontSize=13;align=center;verticalAlign=middle;fillColor=#e1d5e7;strokeColor=#9673a6;strokeWidth=2.5;" vertex="1" parent="1">
          <mxGeometry x="2660" y="870" width="240" height="70" as="geometry" />
        </mxCell>
        <mxCell id="e_score_rel" edge="1" parent="1" source="rel_score" target="ent_score_snap" style="endArrow=none;strokeColor=#9673a6;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_score_rel" value="(1, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#4c1130;" vertex="1" connectable="0" parent="e_score_rel">
          <mxGeometry x="0.3" relative="1" as="geometry"><mxPoint x="14" y="0"/></mxGeometry>
        </mxCell>

        <!-- Snapshot Attributes -->
        <mxCell id="att_score_epoch" value="- - &lt;u&gt;calculated_at&lt;/u&gt; - -&#xa;(Partial Key)" style="ellipse;whiteSpace=wrap;html=1;dashed=1;strokeColor=#d6b656;fillColor=#fff2cc;strokeWidth=2;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="2940" y="830" width="145" height="40" as="geometry" />
        </mxCell>
        <mxCell id="att_score_val" value="- - ( score ) - -&#xa;(Derived 55/20/15/10)" style="ellipse;whiteSpace=wrap;html=1;dashed=1;strokeColor=#b85450;fillColor=#f8cecc;strokeWidth=2;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="2940" y="880" width="145" height="40" as="geometry" />
        </mxCell>
        <mxCell id="att_score_rank" value="- - ( rank ) - -&#xa;(Derived Order)" style="ellipse;whiteSpace=wrap;html=1;dashed=1;strokeColor=#b85450;fillColor=#f8cecc;strokeWidth=2;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="2940" y="930" width="145" height="40" as="geometry" />
        </mxCell>
        <mxCell id="att_score_comp" value="rating_component" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="2940" y="980" width="125" height="35" as="geometry" />
        </mxCell>

        <mxCell id="e_snap_epoch" edge="1" parent="1" source="ent_score_snap" target="att_score_epoch" style="endArrow=none;strokeColor=#d6b656;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_snap_score" edge="1" parent="1" source="ent_score_snap" target="att_score_val" style="endArrow=none;strokeColor=#b85450;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_snap_rank" edge="1" parent="1" source="ent_score_snap" target="att_score_rank" style="endArrow=none;strokeColor=#b85450;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_snap_comp" edge="1" parent="1" source="ent_score_snap" target="att_score_comp" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>


        <!-- ============================================================= -->
        <!-- ZONE 9: LIVE SESSIONS, CHAT & RATINGS (LOWER LEFT)           -->
        <!-- ============================================================= -->
        <!-- Schedules_Into: Identifying DOUBT -> SESSION -->
        <mxCell id="rel_schedules" value="Schedules_Into" style="shape=rhombus;double=1;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2.5;" vertex="1" parent="1">
          <mxGeometry x="990" y="1080" width="160" height="70" as="geometry" />
        </mxCell>
        <!-- Attributes of Schedules_Into -->
        <mxCell id="att_rel_sched_start" value="scheduled_start" style="ellipse;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;strokeWidth=1.5;fontSize=10;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="1190" y="1060" width="115" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_rel_sched_end" value="scheduled_end" style="ellipse;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;strokeWidth=1.5;fontSize=10;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="1190" y="1105" width="115" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_rel_sched_mode" value="mode (ONLINE/OFFLINE)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;strokeWidth=1.5;fontSize=10;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="1190" y="1150" width="150" height="35" as="geometry" />
        </mxCell>
        <mxCell id="e_sched_attr1" edge="1" parent="1" source="rel_schedules" target="att_rel_sched_start" style="endArrow=none;strokeColor=#9673a6;strokeWidth=1.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_sched_attr2" edge="1" parent="1" source="rel_schedules" target="att_rel_sched_end" style="endArrow=none;strokeColor=#9673a6;strokeWidth=1.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_sched_attr3" edge="1" parent="1" source="rel_schedules" target="att_rel_sched_mode" style="endArrow=none;strokeColor=#9673a6;strokeWidth=1.5;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <mxCell id="e_doubt_sched" edge="1" parent="1" source="ent_doubt" target="rel_schedules" style="endArrow=none;strokeColor=#d6b656;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_doubt_sched" value="(0, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#7f6000;" vertex="1" connectable="0" parent="e_doubt_sched">
          <mxGeometry x="-0.3" relative="1" as="geometry"><mxPoint x="15" y="0"/></mxGeometry>
        </mxCell>

        <!-- Entity SESSION -->
        <mxCell id="ent_session" value="SESSION&#xa;(Live Peer Room)" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=15;align=center;verticalAlign=middle;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2.5;shadow=1;" vertex="1" parent="1">
          <mxGeometry x="960" y="1250" width="220" height="75" as="geometry" />
        </mxCell>
        <mxCell id="e_sched_session" edge="1" parent="1" source="rel_schedules" target="ent_session" style="endArrow=none;strokeColor=#d6b656;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_sched_session" value="(1, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#7f6000;" vertex="1" connectable="0" parent="e_sched_session">
          <mxGeometry x="0.3" relative="1" as="geometry"><mxPoint x="15" y="0"/></mxGeometry>
        </mxCell>

        <!-- Session Attributes -->
        <mxCell id="att_sess_id" value="&lt;u&gt;id&lt;/u&gt; (PK)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="1230" y="1230" width="90" height="36" as="geometry" />
        </mxCell>
        <mxCell id="att_sess_stat" value="status" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="1230" y="1275" width="85" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_sess_meet" value="meeting_url" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="1230" y="1320" width="95" height="35" as="geometry" />
        </mxCell>
        <mxCell id="e_sess_id" edge="1" parent="1" source="ent_session" target="att_sess_id" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_sess_stat" edge="1" parent="1" source="ent_session" target="att_sess_stat" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_sess_meet" edge="1" parent="1" source="ent_session" target="att_sess_meet" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <!-- Tutor Teaches in Session -->
        <mxCell id="rel_teaches" value="Teaches" style="shape=rhombus;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1450" y="1255" width="150" height="65" as="geometry" />
        </mxCell>
        <mxCell id="e_session_teaches" edge="1" parent="1" source="ent_session" target="rel_teaches" style="endArrow=none;strokeColor=#d6b656;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_sess_teaches" value="(1, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#7f6000;" vertex="1" connectable="0" parent="e_session_teaches">
          <mxGeometry x="-0.3" relative="1" as="geometry"><mxPoint x="12" y="-12"/></mxGeometry>
        </mxCell>

        <mxCell id="e_teaches_tutor" edge="1" parent="1" source="rel_teaches" target="ent_tutor" style="endArrow=none;strokeColor=#d6b656;strokeWidth=2;">
          <mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="2580" y="1288"/></Array></mxGeometry>
        </mxCell>
        <mxCell id="lbl_teaches_tutor" value="(0, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#7f6000;" vertex="1" connectable="0" parent="e_teaches_tutor">
          <mxGeometry x="0.8" relative="1" as="geometry"><mxPoint x="15" y="15"/></mxGeometry>
        </mxCell>

        <!-- Learner Attends Session -->
        <mxCell id="rel_attends" value="Attends" style="shape=rhombus;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#dae8fc;strokeColor=#6c8ebf;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="720" y="1255" width="140" height="65" as="geometry" />
        </mxCell>
        <mxCell id="e_sess_attends" edge="1" parent="1" source="ent_session" target="rel_attends" style="endArrow=none;strokeColor=#6c8ebf;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_sess_attends" value="(1, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#1f497d;" vertex="1" connectable="0" parent="e_sess_attends">
          <mxGeometry x="-0.3" relative="1" as="geometry"><mxPoint x="-12" y="-12"/></mxGeometry>
        </mxCell>
        <mxCell id="e_attends_lrn" edge="1" parent="1" source="rel_attends" target="ent_learner" style="endArrow=none;strokeColor=#6c8ebf;strokeWidth=2;">
          <mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="790" y="650"/><mxPoint x="1380" y="650"/></Array></mxGeometry>
        </mxCell>
        <mxCell id="lbl_attends_lrn" value="(0, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#1f497d;" vertex="1" connectable="0" parent="e_attends_lrn">
          <mxGeometry x="0.8" relative="1" as="geometry"><mxPoint x="-15" y="-12"/></mxGeometry>
        </mxCell>

        <!-- WEAK ENTITY: SESSION_MESSAGE (Chat) -->
        <mxCell id="rel_chat" value="Contains_Chat" style="shape=rhombus;double=1;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2.5;" vertex="1" parent="1">
          <mxGeometry x="500" y="1255" width="150" height="65" as="geometry" />
        </mxCell>
        <mxCell id="e_sess_chat" edge="1" parent="1" source="ent_session" target="rel_chat" style="endArrow=none;strokeColor=#d6b656;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_sess_chat" value="(0, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#7f6000;" vertex="1" connectable="0" parent="e_sess_chat">
          <mxGeometry x="-0.3" relative="1" as="geometry"><mxPoint x="-12" y="-12"/></mxGeometry>
        </mxCell>

        <mxCell id="ent_message" value="SESSION_MESSAGE&#xa;[[ WEAK ENTITY ]]" style="shape=ext;double=1;rounded=0;whiteSpace=wrap;html=1;fontStyle=1;fontSize=13;align=center;verticalAlign=middle;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2.5;" vertex="1" parent="1">
          <mxGeometry x="220" y="1255" width="210" height="65" as="geometry" />
        </mxCell>
        <mxCell id="e_chat_msg" edge="1" parent="1" source="rel_chat" target="ent_message" style="endArrow=none;strokeColor=#d6b656;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_chat_msg" value="(1, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#7f6000;" vertex="1" connectable="0" parent="e_chat_msg">
          <mxGeometry x="0.3" relative="1" as="geometry"><mxPoint x="12" y="-12"/></mxGeometry>
        </mxCell>

        <!-- Message Attributes -->
        <mxCell id="att_msg_id" value="&lt;u&gt;id&lt;/u&gt; (PK)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="70" y="1225" width="90" height="36" as="geometry" />
        </mxCell>
        <mxCell id="att_msg_created" value="- - &lt;u&gt;created_at&lt;/u&gt; - -&#xa;(Partial Key)" style="ellipse;whiteSpace=wrap;html=1;dashed=1;strokeColor=#d6b656;fillColor=#fff2cc;strokeWidth=2;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="60" y="1270" width="130" height="38" as="geometry" />
        </mxCell>
        <mxCell id="att_msg_body" value="body" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="70" y="1315" width="85" height="35" as="geometry" />
        </mxCell>
        <mxCell id="e_msg_id" edge="1" parent="1" source="ent_message" target="att_msg_id" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_msg_created" edge="1" parent="1" source="ent_message" target="att_msg_created" style="endArrow=none;strokeColor=#d6b656;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_msg_body" edge="1" parent="1" source="ent_message" target="att_msg_body" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <!-- WEAK ENTITY: SESSION_RATING -->
        <mxCell id="rel_rating" value="Rated_In" style="shape=rhombus;double=1;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#e1d5e7;strokeColor=#9673a6;strokeWidth=2.5;" vertex="1" parent="1">
          <mxGeometry x="995" y="1410" width="150" height="65" as="geometry" />
        </mxCell>
        <mxCell id="e_sess_rating" edge="1" parent="1" source="ent_session" target="rel_rating" style="endArrow=none;strokeColor=#9673a6;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_sess_rating" value="(0, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#4c1130;" vertex="1" connectable="0" parent="e_sess_rating">
          <mxGeometry x="-0.3" relative="1" as="geometry"><mxPoint x="14" y="0"/></mxGeometry>
        </mxCell>

        <mxCell id="ent_rating" value="SESSION_RATING&#xa;[[ WEAK ENTITY ]]" style="shape=ext;double=1;rounded=0;whiteSpace=wrap;html=1;fontStyle=1;fontSize=13;align=center;verticalAlign=middle;fillColor=#e1d5e7;strokeColor=#9673a6;strokeWidth=2.5;" vertex="1" parent="1">
          <mxGeometry x="965" y="1560" width="210" height="65" as="geometry" />
        </mxCell>
        <mxCell id="e_rating_rel" edge="1" parent="1" source="rel_rating" target="ent_rating" style="endArrow=none;strokeColor=#9673a6;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_rating_rel" value="(1, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#4c1130;" vertex="1" connectable="0" parent="e_rating_rel">
          <mxGeometry x="0.3" relative="1" as="geometry"><mxPoint x="14" y="0"/></mxGeometry>
        </mxCell>

        <!-- Rating Attributes -->
        <mxCell id="att_rat_id" value="&lt;u&gt;id&lt;/u&gt; (PK)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="800" y="1540" width="90" height="36" as="geometry" />
        </mxCell>
        <mxCell id="att_rat_stars" value="rating (1..5)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="800" y="1585" width="95" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_rat_feedback" value="feedback" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="800" y="1630" width="90" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_rat_happen" value="did_session_happen" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="800" y="1675" width="125" height="36" as="geometry" />
        </mxCell>
        <mxCell id="e_rat_id" edge="1" parent="1" source="ent_rating" target="att_rat_id" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_rat_stars" edge="1" parent="1" source="ent_rating" target="att_rat_stars" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_rat_feedback" edge="1" parent="1" source="ent_rating" target="att_rat_feedback" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_rat_happen" edge="1" parent="1" source="ent_rating" target="att_rat_happen" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>


        <!-- ============================================================= -->
        <!-- ZONE 10: RESOURCES DOMAIN (CENTER & LOWER RIGHT)              -->
        <!-- PROPERLY CONNECTED TO STUDENT!                                -->
        <!-- ============================================================= -->
        <!-- Student Owns_Bucket -> RESOURCE_BUCKET -->
        <mxCell id="rel_owns_bucket" value="Owns_Bucket" style="shape=rhombus;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#bac8d3;strokeColor=#23445d;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="2000" y="1120" width="160" height="65" as="geometry" />
        </mxCell>
        <mxCell id="e_stud_owns_b" edge="1" parent="1" source="ent_student" target="rel_owns_bucket" style="endArrow=none;strokeColor=#23445d;strokeWidth=2;">
          <mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="2080" y="700"/></Array></mxGeometry>
        </mxCell>
        <mxCell id="lbl_stud_owns_b" value="(0, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#0b5394;" vertex="1" connectable="0" parent="e_stud_owns_b">
          <mxGeometry x="0.8" relative="1" as="geometry"><mxPoint x="14" y="-12"/></mxGeometry>
        </mxCell>

        <!-- Entity RESOURCE_BUCKET -->
        <mxCell id="ent_bucket" value="RESOURCE_BUCKET&#xa;(Private Folder)" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=14;align=center;verticalAlign=middle;fillColor=#bac8d3;strokeColor=#23445d;strokeWidth=2.5;shadow=1;" vertex="1" parent="1">
          <mxGeometry x="1970" y="1250" width="220" height="70" as="geometry" />
        </mxCell>
        <mxCell id="e_owns_b_ent" edge="1" parent="1" source="rel_owns_bucket" target="ent_bucket" style="endArrow=none;strokeColor=#23445d;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_owns_b_ent" value="(1, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#0b5394;" vertex="1" connectable="0" parent="e_owns_b_ent">
          <mxGeometry x="0.3" relative="1" as="geometry"><mxPoint x="14" y="0"/></mxGeometry>
        </mxCell>

        <!-- Bucket Attributes -->
        <mxCell id="att_b_id" value="&lt;u&gt;id&lt;/u&gt; (PK)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="1780" y="1240" width="90" height="36" as="geometry" />
        </mxCell>
        <mxCell id="att_b_name" value="name" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="1780" y="1285" width="85" height="35" as="geometry" />
        </mxCell>
        <mxCell id="e_b_id" edge="1" parent="1" source="ent_bucket" target="att_b_id" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_b_name" edge="1" parent="1" source="ent_bucket" target="att_b_name" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <!-- Contains Relationship: RESOURCE_BUCKET -> RESOURCE -->
        <mxCell id="rel_contains" value="Contains" style="shape=rhombus;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#bac8d3;strokeColor=#23445d;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="2000" y="1390" width="160" height="65" as="geometry" />
        </mxCell>
        <mxCell id="e_b_contains" edge="1" parent="1" source="ent_bucket" target="rel_contains" style="endArrow=none;strokeColor=#23445d;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_b_contains" value="(0, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#0b5394;" vertex="1" connectable="0" parent="e_b_contains">
          <mxGeometry x="-0.3" relative="1" as="geometry"><mxPoint x="14" y="0"/></mxGeometry>
        </mxCell>

        <!-- Entity RESOURCE (Superclass) -->
        <mxCell id="ent_resource" value="RESOURCE&#xa;(File Superclass)" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=15;align=center;verticalAlign=middle;fillColor=#bac8d3;strokeColor=#23445d;strokeWidth=3;shadow=1;" vertex="1" parent="1">
          <mxGeometry x="1970" y="1530" width="220" height="75" as="geometry" />
        </mxCell>
        <mxCell id="e_contains_res" edge="1" parent="1" source="rel_contains" target="ent_resource" style="endArrow=none;strokeColor=#23445d;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_contains_res" value="(1, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#0b5394;" vertex="1" connectable="0" parent="e_contains_res">
          <mxGeometry x="0.3" relative="1" as="geometry"><mxPoint x="14" y="0"/></mxGeometry>
        </mxCell>

        <!-- Direct Uploads Relationship: STUDENT -> RESOURCE -->
        <mxCell id="rel_uploads" value="Uploads" style="shape=rhombus;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#bac8d3;strokeColor=#23445d;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1740" y="1460" width="140" height="65" as="geometry" />
        </mxCell>
        <mxCell id="e_stud_uploads" edge="1" parent="1" source="ent_student" target="rel_uploads" style="endArrow=none;strokeColor=#23445d;strokeWidth=2;">
          <mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="1810" y="480"/></Array></mxGeometry>
        </mxCell>
        <mxCell id="lbl_stud_uploads" value="(0, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#0b5394;" vertex="1" connectable="0" parent="e_stud_uploads">
          <mxGeometry x="0.8" relative="1" as="geometry"><mxPoint x="-12" y="-12"/></mxGeometry>
        </mxCell>
        <mxCell id="e_uploads_res" edge="1" parent="1" source="rel_uploads" target="ent_resource" style="endArrow=none;strokeColor=#23445d;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_uploads_res" value="(1, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#0b5394;" vertex="1" connectable="0" parent="e_uploads_res">
          <mxGeometry x="0.3" relative="1" as="geometry"><mxPoint x="12" y="12"/></mxGeometry>
        </mxCell>

        <!-- Resource Superclass Attributes -->
        <mxCell id="att_res_id" value="&lt;u&gt;id&lt;/u&gt; (PK)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="1780" y="1540" width="90" height="36" as="geometry" />
        </mxCell>
        <mxCell id="att_res_title" value="title" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="1780" y="1585" width="85" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_res_desc" value="description" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="1780" y="1630" width="90" height="35" as="geometry" />
        </mxCell>
        <mxCell id="e_res_id" edge="1" parent="1" source="ent_resource" target="att_res_id" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_res_title" edge="1" parent="1" source="ent_resource" target="att_res_title" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_res_desc" edge="1" parent="1" source="ent_resource" target="att_res_desc" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <!-- DISJOINT SPECIALIZATION CIRCLE (d) -->
        <mxCell id="spec_resource" value="d" style="ellipse;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;strokeWidth=2.5;fontStyle=1;fontSize=16;" vertex="1" parent="1">
          <mxGeometry x="2060" y="1670" width="40" height="40" as="geometry" />
        </mxCell>
        <mxCell id="e_spec_res_link" edge="1" parent="1" source="ent_resource" target="spec_resource" style="endArrow=none;strokeColor=#9673a6;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <!-- Disjoint Subclasses of Resource -->
        <mxCell id="ent_res_pdf" value="PDF_RESOURCE&#xa;(Subclass)" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#bac8d3;strokeColor=#23445d;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1640" y="1780" width="150" height="55" as="geometry" />
        </mxCell>
        <mxCell id="ent_res_link" value="LINK_RESOURCE&#xa;(Subclass)" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#bac8d3;strokeColor=#23445d;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1830" y="1780" width="150" height="55" as="geometry" />
        </mxCell>
        <mxCell id="ent_res_photo" value="PHOTO_RESOURCE&#xa;(Subclass)" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#bac8d3;strokeColor=#23445d;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="2020" y="1780" width="160" height="55" as="geometry" />
        </mxCell>
        <mxCell id="ent_res_text" value="TEXT_RESOURCE&#xa;(Subclass)" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#bac8d3;strokeColor=#23445d;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="2220" y="1780" width="150" height="55" as="geometry" />
        </mxCell>

        <mxCell id="e_spec_pdf" edge="1" parent="1" source="spec_resource" target="ent_res_pdf" style="endArrow=block;endFill=0;strokeColor=#9673a6;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_spec_link_sub" edge="1" parent="1" source="spec_resource" target="ent_res_link" style="endArrow=block;endFill=0;strokeColor=#9673a6;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_spec_photo" edge="1" parent="1" source="spec_resource" target="ent_res_photo" style="endArrow=block;endFill=0;strokeColor=#9673a6;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_spec_text" edge="1" parent="1" source="spec_resource" target="ent_res_text" style="endArrow=block;endFill=0;strokeColor=#9673a6;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <!-- Subclass attributes -->
        <mxCell id="att_pdf_key" value="storage_key" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="1660" y="1860" width="105" height="32" as="geometry" />
        </mxCell>
        <mxCell id="att_link_url" value="external_url" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="1850" y="1860" width="105" height="32" as="geometry" />
        </mxCell>
        <mxCell id="att_photo_key" value="storage_key" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="2045" y="1860" width="105" height="32" as="geometry" />
        </mxCell>
        <mxCell id="att_text_body" value="text_content" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="2240" y="1860" width="105" height="32" as="geometry" />
        </mxCell>
        <mxCell id="e_pdf_attr" edge="1" parent="1" source="ent_res_pdf" target="att_pdf_key" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_link_attr" edge="1" parent="1" source="ent_res_link" target="att_link_url" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_photo_attr" edge="1" parent="1" source="ent_res_photo" target="att_photo_key" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_text_attr" edge="1" parent="1" source="ent_res_text" target="att_text_body" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>


        <!-- ============================================================= -->
        <!-- SHARED RESOURCES, PROPOSALS & VOTING (LOWER RIGHT)            -->
        <!-- ============================================================= -->
        <!-- Entity SHARED_RESOURCE_BUCKET -->
        <mxCell id="ent_shared_bucket" value="SHARED_BUCKET&#xa;(Batch Catalog)" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=14;align=center;verticalAlign=middle;fillColor=#b0e3e6;strokeColor=#0e8088;strokeWidth=2.5;shadow=1;" vertex="1" parent="1">
          <mxGeometry x="2900" y="1250" width="220" height="70" as="geometry" />
        </mxCell>
        <!-- Attributes of Shared Bucket -->
        <mxCell id="att_srb_id" value="&lt;u&gt;id&lt;/u&gt; (PK)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="3170" y="1230" width="85" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_srb_batch" value="batch" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="3170" y="1275" width="85" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_srb_dept" value="department" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="3170" y="1320" width="95" height="35" as="geometry" />
        </mxCell>
        <mxCell id="e_srb_id" edge="1" parent="1" source="ent_shared_bucket" target="att_srb_id" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_srb_batch" edge="1" parent="1" source="ent_shared_bucket" target="att_srb_batch" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_srb_dept" edge="1" parent="1" source="ent_shared_bucket" target="att_srb_dept" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <!-- Relationship Stages: SHARED_BUCKET -> RESOURCE_PROPOSAL -->
        <mxCell id="rel_stages" value="Stages" style="shape=rhombus;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#b0e3e6;strokeColor=#0e8088;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="2930" y="1390" width="160" height="65" as="geometry" />
        </mxCell>
        <mxCell id="e_srb_stages" edge="1" parent="1" source="ent_shared_bucket" target="rel_stages" style="endArrow=none;strokeColor=#0e8088;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_srb_stages" value="(0, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#0e8088;" vertex="1" connectable="0" parent="e_srb_stages">
          <mxGeometry x="-0.3" relative="1" as="geometry"><mxPoint x="14" y="0"/></mxGeometry>
        </mxCell>

        <!-- Entity RESOURCE_PROPOSAL -->
        <mxCell id="ent_proposal" value="RESOURCE_PROPOSAL&#xa;(Staged Peer Item)" style="shape=rectangle;whiteSpace=wrap;html=1;fontStyle=1;fontSize=14;align=center;verticalAlign=middle;fillColor=#b0e3e6;strokeColor=#0e8088;strokeWidth=2.5;shadow=1;" vertex="1" parent="1">
          <mxGeometry x="2900" y="1530" width="220" height="75" as="geometry" />
        </mxCell>
        <mxCell id="e_stages_prop" edge="1" parent="1" source="rel_stages" target="ent_proposal" style="endArrow=none;strokeColor=#0e8088;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_stages_prop" value="(1, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#0e8088;" vertex="1" connectable="0" parent="e_stages_prop">
          <mxGeometry x="0.3" relative="1" as="geometry"><mxPoint x="14" y="0"/></mxGeometry>
        </mxCell>

        <!-- Relationship Proposes: STUDENT -> RESOURCE_PROPOSAL -->
        <mxCell id="rel_proposes" value="Proposes" style="shape=rhombus;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#b0e3e6;strokeColor=#0e8088;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="2550" y="1460" width="150" height="65" as="geometry" />
        </mxCell>
        <mxCell id="e_stud_proposes" edge="1" parent="1" source="ent_student" target="rel_proposes" style="endArrow=none;strokeColor=#0e8088;strokeWidth=2;">
          <mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="2625" y="480"/></Array></mxGeometry>
        </mxCell>
        <mxCell id="lbl_stud_proposes" value="(0, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#0e8088;" vertex="1" connectable="0" parent="e_stud_proposes">
          <mxGeometry x="0.8" relative="1" as="geometry"><mxPoint x="-12" y="-12"/></mxGeometry>
        </mxCell>
        <mxCell id="e_proposes_prop" edge="1" parent="1" source="rel_proposes" target="ent_proposal" style="endArrow=none;strokeColor=#0e8088;strokeWidth=2;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_proposes_prop" value="(1, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#0e8088;" vertex="1" connectable="0" parent="e_proposes_prop">
          <mxGeometry x="0.3" relative="1" as="geometry"><mxPoint x="12" y="12"/></mxGeometry>
        </mxCell>

        <!-- Proposal Attributes -->
        <mxCell id="att_rp_id" value="&lt;u&gt;id&lt;/u&gt; (PK)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;strokeWidth=2;fontSize=11;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="3180" y="1500" width="90" height="36" as="geometry" />
        </mxCell>
        <mxCell id="att_rp_title" value="title" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="3180" y="1545" width="85" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_rp_status" value="status" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="3180" y="1590" width="85" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_rp_upvotes" value="- - ( upvotes_count ) - -&#xa;(Derived Aggregation)" style="ellipse;whiteSpace=wrap;html=1;dashed=1;strokeColor=#b85450;fillColor=#f8cecc;strokeWidth=2;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="3180" y="1635" width="150" height="40" as="geometry" />
        </mxCell>

        <mxCell id="e_rp_id" edge="1" parent="1" source="ent_proposal" target="att_rp_id" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_rp_title" edge="1" parent="1" source="ent_proposal" target="att_rp_title" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_rp_status" edge="1" parent="1" source="ent_proposal" target="att_rp_status" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_rp_upvotes" edge="1" parent="1" source="ent_proposal" target="att_rp_upvotes" style="endArrow=none;strokeColor=#b85450;"><mxGeometry relative="1" as="geometry"/></mxCell>

        <!-- WEAK ENTITY: RESOURCE_VOTE -->
        <mxCell id="rel_vote" value="Receives_Vote" style="shape=rhombus;double=1;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;align=center;verticalAlign=middle;fillColor=#b0e3e6;strokeColor=#0e8088;strokeWidth=2.5;" vertex="1" parent="1">
          <mxGeometry x="2930" y="1680" width="160" height="70" as="geometry" />
        </mxCell>
        <!-- Attribute of Receives_Vote -->
        <mxCell id="att_rel_vote_choice" value="vote (APPROVE/REJECT)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;strokeWidth=1.5;fontSize=10;fontStyle=2;" vertex="1" parent="1">
          <mxGeometry x="3140" y="1695" width="155" height="35" as="geometry" />
        </mxCell>
        <mxCell id="e_vote_attr" edge="1" parent="1" source="rel_vote" target="att_rel_vote_choice" style="endArrow=none;strokeColor=#9673a6;strokeWidth=1.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_prop_vote" edge="1" parent="1" source="ent_proposal" target="rel_vote" style="endArrow=none;strokeColor=#0e8088;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_prop_vote" value="(0, N)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#0e8088;" vertex="1" connectable="0" parent="e_prop_vote">
          <mxGeometry x="-0.3" relative="1" as="geometry"><mxPoint x="14" y="0"/></mxGeometry>
        </mxCell>

        <mxCell id="ent_vote" value="RESOURCE_VOTE&#xa;[[ WEAK ENTITY ]]" style="shape=ext;double=1;rounded=0;whiteSpace=wrap;html=1;fontStyle=1;fontSize=13;align=center;verticalAlign=middle;fillColor=#b0e3e6;strokeColor=#0e8088;strokeWidth=2.5;" vertex="1" parent="1">
          <mxGeometry x="2905" y="1820" width="210" height="65" as="geometry" />
        </mxCell>
        <mxCell id="e_vote_rel" edge="1" parent="1" source="rel_vote" target="ent_vote" style="endArrow=none;strokeColor=#0e8088;strokeWidth=2.5;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="lbl_vote_rel" value="(1, 1)" style="edgeLabel;html=1;align=center;verticalAlign=middle;fontSize=11;fontStyle=1;fontColor=#0e8088;" vertex="1" connectable="0" parent="e_vote_rel">
          <mxGeometry x="0.3" relative="1" as="geometry"><mxPoint x="14" y="0"/></mxGeometry>
        </mxCell>

        <!-- Vote Attributes -->
        <mxCell id="att_rv_vote" value="vote (APPROVE/REJECT)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="3180" y="1815" width="150" height="35" as="geometry" />
        </mxCell>
        <mxCell id="att_rv_voted_at" value="voted_at" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#666666;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="3180" y="1860" width="95" height="35" as="geometry" />
        </mxCell>
        <mxCell id="e_rv_vote" edge="1" parent="1" source="ent_vote" target="att_rv_vote" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e_rv_time" edge="1" parent="1" source="ent_vote" target="att_rv_voted_at" style="endArrow=none;strokeColor=#666666;"><mxGeometry relative="1" as="geometry"/></mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

---

## 9. How to Open & View in Draw.io

You can visualize this Chen & Enhanced ER diagram immediately using either of two methods:

### Method 1: Open Native File (Recommended — Instant 1-Click)
1. Navigate to [app.diagrams.net](https://app.diagrams.net).
2. Click **File** → **Open From** → **Device...**
3. Select [`PEERLEARN_CHEN_EER.drawio`](file:///c:/Users/vamsi/OneDrive/Desktop/peerlearn/PEERLEARN_CHEN_EER.drawio) in your project root folder.
4. The complete Chen EER diagram opens on a generous **4800 × 3600** canvas with:
   - **Strong Entities** in solid single rectangles.
   - **Weak Entities** in double rectangles.
   - **Regular Relationships** in single diamonds.
   - **Identifying Relationships** in double diamonds.
   - **Relationship Attributes** attached directly to relationship diamonds.
   - **Specialization Circle `(o)`** showing Learner & Tutor inheritance.
   - **Primary Keys** in solid underlined ovals.
   - **Candidate Keys** indicated with `(CK)`.
   - **Partial Keys** in dashed underlined ovals.
   - **Multivalued Attributes** in double ovals.
   - **Derived Attributes** in dashed ovals.
   - **Min-Max Cardinalities** `(min, max)` labeled on all connecting lines.
   - **Zero Overlaps**: Generous spacing between all entities and attributes across 10 functional zones.

### Method 2: Import via PlantUML
1. In Draw.io, click **Arrange** → **Insert** → **Advanced** → **PlantUML...**
2. Paste the complete PlantUML code from [Section 7](#7-chen-er-diagram-in-graphviz-dot--plantuml).
3. Click **Insert**.
