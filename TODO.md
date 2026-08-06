# TODOs

- [x] In "Pots" page, when adding money to any existing pot, let's have a visual feedback when the user adds way more
      money that exceeds the original goal amount, we won't prevent it but just to make sure the user understands that it
      exceeded the estimated amount. Same with the withdrawal action, but this time we have to prevent the user to withdraw
      more money than the available amount and also have visual UI feedback for it
- [ ] Use tanstack-query to handle client fetching and scan the entire project so we can replace custom
      implementation/hooks with a proper and robust data-fetching layer
- [ ] Improve login and sign in experience. Manually check to improve the UI feedback for errors and stuff.
- [ ] Check the whole authentication flow, and add missing features like reset password, confirmation emails, etc
  - Have a confirmation modal for the "Sign out" sidebar button to avoid miss-clicks
- [ ] Replace Neon's shared Google OAuth credentials with app-owned production credentials before widening the closed
      beta. Configure the Google consent screen and callback URL, save the credentials in Neon Auth, then verify sign-in
      and account linking before removing this exception.
- [ ] Create an onboarding process for brand new users before setting up their accounts
  - Mandatory email confirmation
  - User has to select their currency
  - Check if we need to set any other global preferences for the first time
- [ ] Set a "user global preferences" section in the top-right corner of the screen with a gear icon, so it displays the
      common global preferences
  - Need to figure it out a way to run a "currency migration", this will be part of the global preferences, just need
    to carefully think how is this going to work and if it really has a purpose
- [x] Use nuqs to handle state from URL query params, so we can quickly load filters when navigating to the transactions
      page. e.g from the budgets page, the user clicks to see all the transactions that belongs to a target budget, to it
      niavigates through the URL and the transactions page will quickly apply the filters
- [ ] let the user select their pinned pots & budgets shown in the "Overview" page. Only when it exceeds 4 items
- [ ] We are storing private and sensitive data, we should come to a performant and clever solution to "encode" the data
      such as transaction amounts and all that stuff, it could be easily hacked and check the details if intercepted
- [ ] We need to refactor the credit cards view, it is visually saturated, maybe a table apporach or something less
      invasive visually, let's put all of our designer skills into action
- [ ] Add unit testing for EVERYTHING and every action, case, scenario, and edge case, make this a standard in out
      development and also as part of the LLMs process, because we are dealing with finances and so much functions, so we
      need to make sure everything remains working as expected after each change or addition
- [ ] Standarize DESIGN.md specs
  - [ ] Module headers, to have a consistent pattern where displaying module title and primary actions (like create a
        new entry) in the same header section aligned correctly. There are different patterns across different modules and
        it doesn't look right
  - [ ] The amount formatting + hover pattern to reveal the full amount should be set as a standard for everything
        that displays money on screen
- [x] **PRIVACY MODE**: this is just a basic UI tweak. Will have an eye that will toggle every money amount displayed on
      screen, and the selection preference will persist (need to check if it will across user session or just browser
      session. localStorage) so we can cover the scenario where a user opens the app in front of a crowd, so the whole
      amount are not being displayed at plain sight. Just a little privacy feature that is a nice to have, money is a very
      personal and sensitive information
- [ ] All the calendar input implementation are using the native calendar input, I want the custom one from shadcn, not
      sure if we get rid of it when I asked to add tanstack form library to manage forms, but I do want the custom shadcn
      calendar for every existing form that uses a calendar picker
- [ ] We are assuming that when a user pays a credit card, he wants to pay everything from it, even though not paying
      the total amount gets into more debt and interests, some people pays a custom amount (even more than they have to), so
      we need to offer an option to set a custom amount when paying a credit card, and register the transaction for that
      custom amount
  - [ ] We need to consider adding a new status to a credit card, ONLY when the user didn't pay the whole amount, only
        below that value, we should display a status that they are generating interest or something, don't know the exact
        term in english for that
