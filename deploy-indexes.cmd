@echo off
echo Deploying Firestore indexes...
npx firebase deploy --only firestore:indexes --project lakou-manman
pause
