# TODOs

- [ ] In "Pots" page, when adding money to any existing pot, let's have a visual feedback when the user adds way more
      money that exceeds the original goal amount, we won't prevent it but just to make sure the user understands that it
      exceeded the estimated amount. Same with the withdrawal action, but this time we have to prevent the user to withdraw
      more money than the available amount and also have visual UI feedback for it
- [ ] Use tanstack-query to handle client fetching and scan the entire project so we can replace custom
      implementation/hooks with a proper and robust data-fetching layer
- [ ] Improve login and sign in experience. Manually check to improve the UI feedback for errors and stuff.
- [ ] Check the whole authentication flow, and add missing features like reset password, confirmation emails, etc
  - Have a confirmation modal for the "Sign out" sidebar button to avoid miss-clicks
- [ ] Create an onboarding process for brand new users before setting up their accounts
  - Mandatory email confirmation
  - User has to select their currency
  - Check if we need to set any other global preferences for the first time
- [ ] Set a "user global preferences" section in the top-right corner of the screen with a gear icon, so it displays the
      common global preferences
  - Need to figure it out a way to run a "currency migration", this will be part of the global preferences, just need
    to carefully think how is this going to work and if it really has a purpose
