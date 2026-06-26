# RankUp Education Mobile Application

## Codex AI Development Handover

**Version:** 1.0  
**Platforms:** Android and iOS  
**Framework:** Flutter  
**Roles:** Student, Parent, Teacher  
**Backend:** .NET 10 ASP.NET Core Web API  
**Database:** PostgreSQL  
**Authentication:** JWT, refresh tokens, OTP, roles and permissions

---

## 1. Objective

Build one cross-platform Flutter application named **RankUp Education** for Android and iOS.

The same application must support Student, Parent, and Teacher roles. After login, detect the authenticated role and load the correct dashboard, navigation, permissions, and data.

The mobile app should focus on daily learning, parent monitoring, teacher activities, communication, notifications, rankings, and student progress. Full school and platform administration will remain in the web application.

---

## 2. Flutter Stack

- Flutter and Dart
- Riverpod for state management
- Dio for REST API communication
- GoRouter for navigation
- Freezed and json_serializable for models
- flutter_secure_storage for tokens
- Drift with SQLite for offline data
- Firebase Cloud Messaging for push notifications
- flutter_local_notifications
- Firebase Crashlytics
- connectivity_plus
- image_picker and file_picker
- cached_network_image
- permission_handler
- share_plus
- qr_flutter and mobile_scanner
- SignalR client or WebSocket client
- flutter_test, mocktail, and integration_test

Use null safety throughout.

---

## 3. Architecture

Use feature-based Clean Architecture.

```text
lib/
├── app/
│   ├── app.dart
│   ├── router.dart
│   ├── theme.dart
│   ├── localization.dart
│   └── environment.dart
├── core/
│   ├── api/
│   ├── auth/
│   ├── errors/
│   ├── network/
│   ├── notifications/
│   ├── permissions/
│   ├── storage/
│   ├── synchronization/
│   ├── utilities/
│   └── widgets/
├── features/
│   ├── authentication/
│   ├── profile/
│   ├── student_dashboard/
│   ├── parent_dashboard/
│   ├── teacher_dashboard/
│   ├── quizzes/
│   ├── worksheets/
│   ├── discussions/
│   ├── rankings/
│   ├── rewards/
│   ├── ai_assistant/
│   ├── learning_path/
│   ├── goals/
│   ├── portfolio/
│   ├── career_guidance/
│   ├── competitions/
│   ├── messaging/
│   ├── notifications/
│   ├── attendance/
│   ├── reports/
│   ├── sharing/
│   ├── search/
│   ├── settings/
│   └── support/
└── main.dart
```

Each feature should contain:

```text
feature/
├── data/
│   ├── datasources/
│   ├── models/
│   └── repositories/
├── domain/
│   ├── entities/
│   ├── repositories/
│   └── usecases/
└── presentation/
    ├── controllers/
    ├── pages/
    ├── providers/
    └── widgets/
```

Do not put business rules or API calls directly in widgets.

---

## 4. Environments

Support:

- Development
- Test
- Staging
- Production

Store API URLs, SignalR URLs, feature flags, and logging configuration by environment. Do not commit secrets.

---

## 5. Authentication and Role Routing

Supported roles:

- Student
- Parent
- Teacher

JWT claims should include:

- User ID
- Role
- Permissions
- School ID
- Campus ID
- Profile ID

Routing:

```text
Student -> Student Dashboard
Parent  -> Parent Dashboard
Teacher -> Teacher Dashboard
```

Authentication features:

- Splash screen
- Onboarding
- Login
- OTP verification
- Forgot and reset password
- Access-token refresh
- Logout
- Session expiration handling
- Device registration
- Optional biometric login
- Terms and privacy acceptance

Student login identifiers:

- Public username
- Student ID
- School registration number
- Password or PIN

Parent and teacher identifiers:

- Mobile number
- Email
- Password
- OTP

B-Form and CNIC may be used for verification only. Never display them publicly or use them as passwords.

---

## 6. Main Navigation

### Student

- Home
- Learn
- AI Assistant
- Rankings
- Profile

### Parent

- Home
- Children
- Messages
- Reports
- Profile

### Teacher

- Home
- Classes
- Activities
- Messages
- Profile

Use bottom navigation for primary modules and a More menu for secondary features.

---

## 7. Common Features

Available according to permission:

- Profile
- Notifications
- Messaging
- Discussions
- Search
- Settings
- Help and support
- Complaint and abuse reporting
- Privacy controls
- Language selection
- Theme selection
- Logout

---

# 8. Student Features

## 8.1 Dashboard

Display:

- Name and profile image
- School, grade, and section
- Current level and total points
- Overall, class, school, and subject ranks
- Learning streak
- Badges and certificates
- Today’s activities
- Pending quizzes and worksheets
- Upcoming deadlines
- Subject performance
- Weak and strong topics
- AI-recommended next activity
- Teacher feedback
- Recent achievements

## 8.2 Quiz Module

Features:

- Assigned, available, upcoming, and completed quizzes
- Search and filters
- Instructions and attempt rules
- Timed attempts
- Save and resume
- Mark question for review
- Submit quiz
- Results and explanations
- AI feedback
- Points and rank impact
- Retry when allowed

Question types:

- Multiple choice
- Multiple selection
- True/false
- Fill in the blanks
- Matching
- Ordering
- Short answer
- Descriptive answer
- Image and audio questions
- Mathematical working
- Coding answer

Result details:

- Total, attempted, and unattempted questions
- Correct, incorrect, and partial answers
- Score and percentage
- Time spent
- Topic and difficulty performance
- Points earned
- Rank impact
- Improvement from previous attempt
- Recommended next activity

## 8.3 Worksheet Module

Features:

- Assigned and practice worksheets
- Search and subject filters
- Interactive completion
- Printable download
- Draft saving
- Camera capture
- Multi-page image and PDF upload
- Submission status
- Teacher feedback
- AI evaluation
- Points earned

Statuses:

```text
Assigned
In Progress
Submitted
Under Review
Reviewed
Returned
Completed
Overdue
```

## 8.4 Discussion Board

Features:

- Class, subject, school, and permitted public discussions
- Create topic where allowed
- Replies and mentions
- Helpful votes
- Accepted answer
- Bookmark and follow
- AI-highlighted answers
- Report and block
- Approved sharing

## 8.5 Rankings and Rewards

Show:

- Overall rank
- Class rank
- School rank
- Subject rank
- Improvement rank
- Consistency rank
- Discussion rank
- Helpful-student rank
- City and national rank where permitted
- Level progress
- Point categories
- Badges
- Certificates
- Rank history

Filters:

- Today
- Week
- Month
- Term
- Academic year
- Grade
- Subject
- School
- City
- Country

## 8.6 AI Learning Assistant

Allow students to:

- Ask educational questions
- Request simple explanations
- Ask for examples and hints
- Generate practice questions
- Review solution methods
- Explain mistakes
- Translate explanations
- Create revision plans
- Receive quiz and worksheet recommendations

AI responses must be age appropriate, labeled as AI generated, and reportable.

## 8.7 Personalized Learning Path

Show:

- Current learning level
- Weak and strong topics
- Recommended sequence
- Assigned activities
- Target dates
- Progress percentage
- Review checkpoints
- Completed and next activities

## 8.8 Learning Goals

Support student, parent, teacher, and AI-created goals:

- Daily
- Weekly
- Subject
- Topic
- Exam preparation
- Reading
- Skill development
- Career exploration

## 8.9 Student Portfolio

Support:

- Introduction
- Achievements
- Certificates
- Projects
- Skills
- Interests
- Career goals
- Extracurricular achievements
- Best quizzes, worksheets, and discussion answers
- Visibility controls
- Secure link and QR sharing

## 8.10 Career Guidance

Support:

- Interest assessment
- Skill assessment
- Career suggestions
- Recommended subjects and skills
- Saved career interests
- Sharing with parents and teachers

Career guidance is advisory only.

## 8.11 Competitions

Support:

- Competition list and details
- Registration
- Rules and schedule
- Attempts
- Rankings
- Certificates
- Prizes
- History

---

# 9. Parent Features

## 9.1 Dashboard

Show:

- Linked children
- Child summary cards
- Latest results
- Weak-topic alerts
- Teacher feedback
- Attendance summary
- Pending work and deadlines
- Achievements and rank changes
- AI recommendations
- Unread messages

## 9.2 Child Switching

Support multiple linked children and preserve the selected child.

## 9.3 Child Progress

Show:

- Overall, subject, and topic performance
- Quiz and worksheet history
- Rank and badge history
- Learning streak and goals
- Weak and strong subjects/topics
- Period comparison
- Class and school average comparisons where permitted

## 9.4 Parent Quiz and Worksheet Features

Allow parents to:

- View results
- Create basic private quizzes and worksheets
- Generate basic AI activities
- Assign to their child
- Set due dates
- Monitor completion
- View teacher feedback

Public content publishing is excluded from the mobile MVP.

## 9.5 Parent Goals and AI Guidance

Allow parents to:

- Create and monitor goals
- View teacher, student, and AI goals
- Receive recommended study time
- Receive suggested quizzes and worksheets
- Receive support guidance
- Receive suggested teacher discussion points

## 9.6 Parent-Teacher Communication

Support:

- Teacher contacts
- Direct messages
- Feedback
- Class announcements
- Child report sharing
- Meeting requests
- Communication reporting

## 9.7 Privacy and Approvals

Allow parents to:

- Approve cross-school communication
- Control child profile and portfolio visibility
- Review linked devices
- Review consent history
- Block users
- Report content

---

# 10. Teacher Features

## 10.1 Dashboard

Show:

- School and teacher profile
- Assigned classes and subjects
- Today’s schedule
- Class performance summary
- Pending reviews
- Students requiring attention
- Upcoming quizzes and worksheets
- Discussion activity
- Unread messages
- AI teaching recommendations

## 10.2 Class and Student View

Allow teachers to:

- View classes, sections, and students
- Search students
- View student profiles
- View performance and weak topics
- View recent quiz and worksheet results
- View attendance summary

Bulk administration remains on the web.

## 10.3 Quiz Features

Allow teachers to:

- View quizzes
- Create basic quizzes
- Generate basic AI quizzes
- Add MCQ, true/false, and short-answer questions
- Assign to a class or selected students
- Set start, end, and time limit
- View attempts
- Review descriptive answers
- Approve AI evaluation
- Publish results
- Add feedback

Advanced quiz building remains on the web.

## 10.4 Worksheet Features

Allow teachers to:

- View and create basic worksheets
- Generate basic AI worksheets
- Assign to classes or students
- Set due dates
- Review image and PDF submissions
- Add feedback
- Return for correction
- Mark completed

## 10.5 Attendance

Allow teachers to:

- Select class and date
- Mark present, absent, or late
- Add remarks
- Save attendance
- View history
- Correct records where permitted

## 10.6 Discussions and Feedback

Allow teachers to:

- Create class and subject discussions
- Reply to students
- Mark accepted answers
- Pin and close discussions
- Review reported posts
- Add general, quiz, worksheet, and subject feedback
- Mark students for attention
- Recommend activities
- Share feedback with parents

## 10.7 Teacher Messaging and AI

Allow:

- Student and parent messages
- Class announcements
- Group messages
- AI-generated quizzes, worksheets, discussions, explanations, answer keys, improvement plans, and feedback suggestions

All AI-generated content must be labeled and teacher reviewed.

---

# 11. Messaging

Support:

- One-to-one messages
- Class groups
- Study groups
- Parent-teacher conversations
- Teacher-student conversations
- Text, image, document, and optional audio messages
- Read receipts
- Typing indicator
- Search
- Reporting and blocking
- Push notifications

Apply role, age, school, and child-safety restrictions.

---

# 12. Notifications

Support push, local, and in-app notifications with deep linking.

Types:

- Quiz and worksheet assignment
- Result published
- New message
- Discussion reply
- Teacher feedback
- Rank change
- Badge or certificate
- Attendance alert
- Goal reminder
- Competition reminder
- Approval result

---

# 13. Search and Sharing

Search permitted:

- Quizzes
- Worksheets
- Discussions
- Subjects
- Topics
- Learning resources
- Students and teachers where permitted
- Competitions

Share permitted:

- Quiz and worksheet results
- Badges and certificates
- Rank and achievements
- Progress reports
- Portfolio links

Methods:

- In-app
- Secure or expiring link
- QR code
- Native device sharing
- PDF download

Never expose private identifiers.

---

# 14. Reports

## Student

- Weekly and monthly progress
- Subject and topic performance
- Quiz and worksheet history
- Rank and improvement history

## Parent

- Child progress
- Subject comparison
- Weak-topic report
- Teacher feedback
- Rank and achievement report

## Teacher

- Class and student summary
- Quiz performance
- Worksheet completion
- Weak-student list
- Topic-wise performance

Advanced report setup and exports remain on the web.

---

# 15. Offline Support

Support limited offline functionality:

- Cached content
- Downloaded worksheets
- Quiz and worksheet drafts
- Unsent messages
- Temporary worksheet images
- Synchronization after reconnecting

Rules:

- Unique local sync ID
- Duplicate prevention
- Pending-sync indicator
- Retry
- Server conflict resolution
- Error logging
- Expiry validation

---

# 16. Localization and Accessibility

MVP languages:

- English
- Urdu

Support runtime language switching, LTR/RTL layouts, translated validation, localized dates, and language-aware AI responses.

Accessibility:

- Scalable text
- Screen-reader labels
- Good contrast
- Large tap targets
- Clear validation
- Alternative text
- Reduced motion where practical

---

# 17. UI Requirements

Use Material 3.

The UI should be:

- Modern
- Clean
- Educational
- Child friendly but not childish
- Suitable for teenagers, parents, and teachers
- Responsive
- Reusable

Include:

- Dashboard cards
- Skeleton loading
- Empty states
- Error states
- Retry
- Pull to refresh
- Pagination or infinite scrolling

---

# 18. API Integration

Use Dio interceptors for:

- Access token
- Refresh token
- Error mapping
- Safe retry
- Connectivity
- Development logging

Support:

- Pagination
- Filters
- Sorting
- Search
- File upload
- Progress
- Cancellation

Expected response pattern:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {},
  "errors": []
}
```

---

# 19. Security

- Use secure token storage
- HTTPS only
- Never store passwords
- Never log sensitive data
- Mask CNIC and B-Form
- Validate file type and size
- Enforce screen and action permissions
- Clear sensitive cache on logout
- Support forced logout and suspension
- Hide phone numbers and precise locations
- Protect child communication
- Prevent sensitive information in shared content

---

# 20. Testing

Create:

- Unit tests
- Widget tests
- Repository tests
- Riverpod provider tests
- API mock tests
- Navigation tests
- Role and permission tests
- Offline synchronization tests
- File upload tests
- Integration tests

Critical flows:

- Login for all roles
- Role routing
- Quiz attempt and submission
- Worksheet upload
- Parent child switching
- Teacher assignment
- Messaging
- Token refresh
- Offline sync

---

# 21. MVP Scope

## Common

- Splash
- Login and OTP
- Forgot password
- Role routing
- Profile
- Notifications
- Settings
- Logout

## Student

- Dashboard
- Quiz list, attempt, and result
- Worksheet list and upload
- Rankings
- Points and levels
- AI assistant
- Learning goals
- Basic messages

## Parent

- Dashboard
- Child selection and progress
- Quiz and worksheet results
- Teacher feedback
- Alerts
- Parent-teacher messaging
- AI recommendations

## Teacher

- Dashboard
- Classes and students
- Student performance
- Quiz and worksheet assignment
- Basic review
- Attendance
- Messaging
- Notifications

---

# 22. Later Phases

- Advanced adaptive quizzes
- Full portfolio
- Career assessments
- Competitions
- Full offline quizzes
- Advanced AI answer evaluation
- Audio messages
- Video learning
- Live competitions
- Multi-role switching
- Advanced moderation
- Parent approval workflow
- Advanced analytics

---

# 23. Codex Implementation Order

1. Create the Flutter project.
2. Configure dependencies and environments.
3. Create theme and shared widgets.
4. Implement API client and error handling.
5. Implement authentication and secure storage.
6. Implement role-based routing.
7. Implement Student Dashboard.
8. Implement Parent Dashboard.
9. Implement Teacher Dashboard.
10. Implement Quiz Module.
11. Implement Worksheet Module.
12. Implement Notifications.
13. Implement Messaging.
14. Implement Rankings and Rewards.
15. Implement AI Assistant.
16. Implement offline storage and synchronization.
17. Add localization.
18. Add tests.
19. Configure Android.
20. Configure iOS.
21. Prepare staging and production builds.

Use mock repositories when backend APIs are unavailable.

---

# 24. Required Deliverables

Codex AI must produce:

- Flutter source code
- Android configuration
- iOS configuration
- Feature-based Clean Architecture
- Environment configuration
- Authentication
- Role-based routing
- Student, Parent, and Teacher dashboards
- Quiz and Worksheet modules
- Messaging and Notifications
- Rankings and AI Assistant
- Offline storage foundation
- English and Urdu localization foundation
- Automated tests
- README
- Setup instructions
- Build instructions
- API integration guide

---

# 25. Final Acceptance Criteria

The result must be one Flutter application that:

- Runs on Android and iOS
- Uses one shared codebase
- Supports Student, Parent, and Teacher roles
- Loads role-specific dashboards and navigation
- Uses secure JWT authentication
- Connects to a .NET 10 REST API
- Supports quizzes and worksheets
- Supports progress, rankings, and rewards
- Supports AI learning assistance
- Supports messaging and notifications
- Supports English and Urdu
- Uses maintainable architecture
- Includes tests and documentation
