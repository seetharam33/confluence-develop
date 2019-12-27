from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from pymongo import MongoClient
from pprint import pprint
API_KEY='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'
client = MongoClient()
db=client.confluence
users = db.users
associates = db.associates
#incomplete_profile_users = users.find({},{'_id':0,'first_name':1,'dob':1,'gender':1,'guardian':1,'address':1,'workExp':1,'tenth':1,'twelfth':1,'grad':1,'scores':1})
incomplete_profile_users = users.find({'$or':[{'dob':{'$exists':False}},{'gender':{'$exists':False}},{'guardian':{'$exists':False}},{'address':{'$exists':False}},{'workExp':{'$exists':False}},{'tenth':{'$exists':False}},{'twelfth':{'$exists':False}},{'grad':{'$exists':False}},{'scores':{'$exists':False}}]},{'_id':0,'email':1,'associate':1,'first_name':1,'dob':1,'gender':1,'guardian':1,'address':1,'workExp':1,'tenth':1,'twelfth':1,'grad':1,'scores':1})
count=0
for user in incomplete_profile_users:
    count+=1
    print(user['email'])
    if not 'associate' in user:
        message = Mail(
            from_email='study@confluenceoverseas.com',
            to_emails=user['email'],
            subject='Reminder to Fill Your Information',
            html_content='Hello '+user['first_name']+', <br>This is a reminder to fill in Your Information in the dashboard ( dashboard.confluenceedu.com ). Please fill in all the Information marked with a * in the Profile and Education Tabs.<br>Regards<br>ConfluenceEdu')
    else:
        print("sending via Associate")
        associate = associates.find_one({'_id':user['associate']})
        print(associate['email'])
        message = Mail(
            from_email='study@confluenceoverseas.com',
            to_emails=associate['email'],
            subject='Reminder to Fill Your Information',
            html_content='Hello '+associate['first_name']+', <br>This is a reminder to fill in Your Students Information Regarding '+user['first_name']+'('+user['email']+') in the dashboard ( dashboard.confluenceedu.com/hub ). Please fill in all the Information marked with a * in the Profile and Education Tabs.<br>Regards<br>ConfluenceEdu')

    try:
        sg = SendGridAPIClient(API_KEY)
        response = sg.send(message)
        print(response.status_code)
    except Exception as e:
        print(e.message)

print("sent",count,"Emails")
