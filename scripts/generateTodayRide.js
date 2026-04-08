const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function getPakistanTodayString() {
  const now = new Date();
  const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  return pakistanTime.toISOString().split('T')[0];
}

async function generateRidesForToday() {
  try {
    const todayStr = getPakistanTodayString();
    console.log(`Checking for rides on today's date: ${todayStr}`);
    
    // 1. Fetch all routes
    const routesSnap = await db.collection('routes').get();
    if (routesSnap.empty) {
      console.log('No routes found in the database. Please ensure routes are created first.');
      process.exit();
    }
    
    for (const doc of routesSnap.docs) {
      const routeData = doc.data();
      const routeId = doc.id;
      
      // 2. Check if a ride already exists for today and this route
      const existingRideSnap = await db.collection('rides')
        .where('routeId', '==', routeId)
        .where('date', '==', todayStr)
        .get();
        
      if (!existingRideSnap.empty) {
        console.log(`A ride already exists for route "${routeData.routeName || routeId}" on ${todayStr}.`);
        const existingRideDoc = existingRideSnap.docs[0];
        
        if (existingRideDoc.data().status !== 'scheduled') {
           console.log(`--> Updating status from '${existingRideDoc.data().status}' to 'scheduled' for testing.`);
           await db.collection('rides').doc(existingRideDoc.id).update({
             status: 'scheduled'
           });
        } else {
           console.log(`--> Status is already 'scheduled'. Ready for testing.`);
        }
      } else {
        console.log(`Creating new scheduled ride for route "${routeData.routeName || routeId}" on ${todayStr}...`);
        
        await db.collection('rides').add({
          routeId: routeId,
          routeName: routeData.routeName || 'Unknown Route',
          driverId: routeData.assignedDriverId || '',
          date: todayStr,
          status: 'scheduled',
          departureTime: routeData.departureTime || '8:00 AM',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`--> Successfully created!`);
      }
    }
    
    console.log(`\n✅ Done! Open your Driver App and the "Start Ride" card should now appear under "Today's Ride".`);
  } catch (error) {
    console.error('❌ Error generating rides:', error);
  } finally {
    process.exit();
  }
}

generateRidesForToday();
