from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from pymongo import MongoClient
from pprint import pprint
from datetime import datetime
API_KEY='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'
client = MongoClient()
db=client.confluence
users = db.users
associates = db.associates

birthday_users = users.aggregate([{"$match":{"dob":{"$ne":None}}},{"$project":{"_id":0,"email":1,"first_name":1,"last_name":1,"associate":1,"dob":1,"todayDay":{"$dayOfYear": datetime.today()},"birthdayDay":{"$dayOfYear":"$dob"}}},{"$project":{"email":1,"first_name":1,"last_name":1,"associate":1,"dob":1,"isBirthday":{"$eq":["$todayDay","$birthdayDay"]}}},{"$match":{"isBirthday":True}}])

birthday_associates = associates.aggregate([{"$match":{"dob":{"$ne":None}}},{"$project":{"_id":0,"email":1,"first_name":1,"dob":1,"todayDay":{"$dayOfYear": datetime.today()},"birthdayDay":{"$dayOfYear":"$dob"}}},{"$project":{"email":1,"first_name":1,"dob":1,"isBirthday":{"$eq":["$todayDay","$birthdayDay"]}}},{"$match":{"isBirthday":True}}])

for user in birthday_users:
    pprint(user)
    if not 'associate' in user:
        message = Mail(
            from_email='study@confluenceoverseas.com',
            to_emails=user['email'],
            subject='Happy Birthday',
            html_content='Hello '+user['first_name']+', <br>We at ConfluenceEdu wish you a Happy Birthday<br>Regards<br>ConfluenceEdu')

    try:
        sg = SendGridAPIClient(API_KEY)
        response = sg.send(message)
        print(response.status_code)
    except Exception as e:
        print(e.message)
for user in birthday_associates:
    pprint(user)
    if not 'associate' in user:
        message = Mail(
            from_email='study@confluenceoverseas.com',
            to_emails=user['email'],
            subject='Happy Birthday',
            html_content='Hello '+user['first_name']+', <br>We at ConfluenceEdu wish you a Happy Birthday<br>Regards<br>ConfluenceEdu')

    try:
        sg = SendGridAPIClient(API_KEY)
        response = sg.send(message)
        print(response.status_code)
    except Exception as e:
        print(e.message)

