Write-Host "Deploying Firestore indexes..."
npx firebase deploy --only firestore:indexes --project lakou-manman
Write-Host "Done."
