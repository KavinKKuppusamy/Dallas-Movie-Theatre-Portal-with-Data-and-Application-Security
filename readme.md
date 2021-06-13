CS 6348.001 Data and Application Security
-----------------------------------------------------

The Dallas Movie Theatre App is an application designed to allow customers to purchase tickets to movies at the Dallas Theatre. Theatre management can also use this app to manage the scheduling of movies by performing adding, updating, and removing actions. Company employees can do analytical operations and generate report.


Application Modules
-------------------
Customer Management Module:
---------------------------
The following are the functionalities of the Customer Management Module:
1. The customers can visit the site and register with their details (First name, Last name, username, etc). They can then login with the registered username and password incorporated with verification code based 2-factor authentication.
2. After the login, the customer can search and filter (by movie genre) from the list of all the available movies in the theatre. Customers can also add tickets to the cart for a show by selecting the date and showtime for a movie.
3. Customers can delete and update the quantity of the movie items on the cart page. When customers decide to purchase the ticket, they can check out from the cart. Customers can view their successful booking on the Transaction history page.
4. Customer credit cards details and sensitive information are encrypted/masked while storing it in the database.

Employee Management Module:
----------------------------
Application Admin: Theatre management/ Application Admin can login as admin and can create, update, or remove showings to indicate which movies are available in the theatre.
Financial Team: The member in this team has access to customer transaction and can update the ticket price of a movie.
Analytical Team: They can access both customer and employee information to derive insights on the key performance indicator metrics (KPI).

Motivation behind Implementing Security Features
-------------------------------------------------

We have implemented Security features in our application and motive behind implementing are,
•	Our app handles customer's credit card details and we must protect Sensitive Information like Credit Card details
•	Enforce enterprise-specific security policies for users and groups to authorize who can only to what.
•	Prevent cybercriminals from accessing your private information while login to application.

Feature Relevant to Data and Application Security : 
---------------------------------------------------
•	Verification code based 2-factor authentication
•	Data encryption and masking on sensitive information such as credit card etc, 
•	Query modification algorithm integrated with RBAC.

Software to Install
-------------------
1) NodeJS
2) MongoDB


How to run
----------
1) npm install
2) nodemon
3) Application can be opened in browser at localhost:3000

The Project includes mongo db json files as well.
