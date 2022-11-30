# USupport-notifications

USupport notifications Node.js API service

The available types of notifications are as follows:

1. consultation_booking

- Client: confirm booked consultation
- Provider: notify about booked consultation

2. consultation_reschedule

- Client: confirm consultation rescheduling
- Provider: notify about consultation rescheduling

3. consultation_cancellation

- Client: confirm consultation cancellation
- Provider: notify about consultation cancellation

4. consultation_cancellation_provider

- Client: notify about consultation cancellation
- Provider: confirm consultation cancellation

5. consultation_remind_start

- Client: remind about consultation start
- Provider: remind about consultation start

6. consultation_suggestion

- Client: notify about consultation suggestion
- Provider: confirm consultation suggestion

7. consultation_suggestion_confirmation

- Client: confirm booked consultation suggestion
- Provider: notify about booked consultation suggestion

8. consultation_suggestion_cancellation

- Client: confirm canceled consultation suggestion
- Provider: notify about canceled consultation suggestion

9. add_more_availability_slots

- Provider: remind a provider to add more availability slots to their schedule

10. weekly_report

- Provider: overview of any activites that happened in the past 1 week

11. monthly_report

- Provider: overview of any activites that happened in the past 1 month
