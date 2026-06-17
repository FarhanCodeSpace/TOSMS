// cd functions
// npm install firebase-admin firebase-functions node-fetch
// firebase login
// firebase use TOSMS-App
// firebase deploy --only functions

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

const COLLECTIONS = {
  USERS: "users",
  RIDES: "rides",
  ROUTES: "routes",
  AVAILABILITY: "availability",
  FEE_PAYMENTS: "feePayments",
};

/**
 * Helper function to send Expo push notifications.
 */
async function sendExpoPush(tokens, title, body, data) {
  if (!tokens || tokens.length === 0) return;

  // Filter out invalid tokens
  const validTokens = tokens.filter(
    (t) => t && typeof t === "string" && t.startsWith("ExponentPushToken"),
  );
  if (validTokens.length === 0) return;

  // Batch tokens into chunks of 100
  const batches = [];
  for (let i = 0; i < validTokens.length; i += 100) {
    batches.push(validTokens.slice(i, i + 100));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      const messages = batch.map((token) => ({
        to: token,
        sound: "default",
        title,
        body,
        data,
      }));

      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messages),
        });
        return await response.json();
      } catch (error) {
        console.error("Error sending Expo push batch:", error);
        return null;
      }
    }),
  );

  return results;
}

/**
 * Function 1 — availabilityReminder:
 * Scheduled for 9 PM PKT every day.
 */
exports.availabilityReminder = functions.pubsub
  .schedule("0 21 * * *")
  .timeZone("Asia/Karachi")
  .onRun(async (context) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split("T")[0];

    const usersSnapshot = await admin
      .firestore()
      .collection(COLLECTIONS.USERS)
      .where("status", "==", "active")
      .get();

    const studentTokens = [];
    const driverTokens = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const uid = userDoc.id;

      if (!userData.expoPushToken) continue;

      // Check if availability exists for tomorrow
      const availabilitySnapshot = await admin
        .firestore()
        .collection(COLLECTIONS.AVAILABILITY)
        .where("userId", "==", uid)
        .where("date", "==", tomorrowString)
        .limit(1)
        .get();

      if (availabilitySnapshot.empty) {
        if (userData.role === "driver") {
          driverTokens.push(userData.expoPushToken);
        } else {
          studentTokens.push(userData.expoPushToken);
        }
      }
    }

    if (studentTokens.length > 0) {
      await sendExpoPush(
        studentTokens,
        "Mark Availability",
        "Mark if you need transport tomorrow. Deadline 10 PM.",
        { type: "availability_reminder", role: "student" },
      );
    }

    if (driverTokens.length > 0) {
      await sendExpoPush(
        driverTokens,
        "Mark Route Availability",
        "Please mark your availability and vehicle status for tomorrow.",
        { type: "availability_reminder", role: "driver" },
      );
    }

    return null;
  });

/**
 * Function 2 — availabilityDeadlineReport:
 * Scheduled for 10 PM PKT every day.
 */
exports.availabilityDeadlineReport = functions.pubsub
  .schedule("0 22 * * *")
  .timeZone("Asia/Karachi")
  .onRun(async (context) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split("T")[0];

    // Fetch all routes
    const routesSnapshot = await admin
      .firestore()
      .collection(COLLECTIONS.ROUTES)
      .get();
    let summaryString = `Availability Summary for ${tomorrowString}:\n`;

    for (const routeDoc of routesSnapshot.docs) {
      const routeData = routeDoc.data();
      const routeId = routeDoc.id;

      // Count tomorrow's availability for this route
      const availabilitySnapshot = await admin
        .firestore()
        .collection(COLLECTIONS.AVAILABILITY)
        .where("routeId", "==", routeId)
        .where("date", "==", tomorrowString)
        .where("isAvailable", "==", true)
        .get();

      summaryString += `- ${routeData.name}: ${availabilitySnapshot.size} students\n`;

      // Check driver availability
      const driverUid = routeData.driverId;
      if (driverUid) {
        const driverAvailability = await admin
          .firestore()
          .collection(COLLECTIONS.AVAILABILITY)
          .where("userId", "==", driverUid)
          .where("date", "==", tomorrowString)
          .limit(1)
          .get();

        if (driverAvailability.empty) {
          // Notify admins about driver not marking availability
          const adminsSnapshot = await admin
            .firestore()
            .collection(COLLECTIONS.USERS)
            .where("role", "==", "admin")
            .get();

          const adminTokens = adminsSnapshot.docs
            .map((d) => d.data().expoPushToken)
            .filter((t) => !!t);

          if (adminTokens.length > 0) {
            const driverSnapshot = await admin
              .firestore()
              .collection(COLLECTIONS.USERS)
              .doc(driverUid)
              .get();
            const driverName = driverSnapshot.exists
              ? driverSnapshot.data().name
              : "Unknown Driver";

            await sendExpoPush(
              adminTokens,
              "Driver Not Marked",
              `${driverName} has not marked availability for ${routeData.name}`,
              { type: "availability_report" },
            );
          }
        }
      }
    }

    // Send summary to admins
    const adminsSnapshot = await admin
      .firestore()
      .collection(COLLECTIONS.USERS)
      .where("role", "==", "admin")
      .get();

    const adminTokens = adminsSnapshot.docs
      .map((d) => d.data().expoPushToken)
      .filter((t) => !!t);

    if (adminTokens.length > 0) {
      await sendExpoPush(adminTokens, "Availability Report", summaryString, {
        type: "availability_report",
      });
    }

    return null;
  });

/**
 * Function 3 — onReviewCreated:
 * Triggered when a student submits a new review.
 */
exports.onReviewCreated = functions.firestore
  .document("reviews/{reviewId}")
  .onCreate(async (snap, context) => {
    const review = snap.data();
    const driverId = review && review.driverId;

    if (!driverId) return null;

    const driverRef = admin
      .firestore()
      .collection(COLLECTIONS.USERS)
      .doc(driverId);

    await admin.firestore().runTransaction(async (transaction) => {
      const driverSnap = await transaction.get(driverRef);
      if (!driverSnap.exists) return;

      const driverData = driverSnap.data() || {};
      const currentRating = Number(driverData.rating) || 0;
      const totalRides = Number(driverData.totalRides) || 0;
      const reviewRating = Number(review.rating) || 0;

      const updatedTotalRides = totalRides + 1;
      const updatedRating =
        (currentRating * totalRides + reviewRating) / updatedTotalRides;

      transaction.update(driverRef, {
        rating: Number(updatedRating.toFixed(1)),
        totalRides: updatedTotalRides,
      });
    });

    return null;
  });

/**
 * Function 3 — feeReminder:
 * Scheduled for 1st of month at 9 AM PKT.
 */
exports.feeReminder = functions.pubsub
  .schedule("0 9 1 * *")
  .timeZone("Asia/Karachi")
  .onRun(async (context) => {
    const now = new Date();
    const currentMonth = now.toLocaleString("default", { month: "long" });
    const currentYear = now.getFullYear();
    const monthId = `${currentMonth}_${currentYear}`;

    const studentsSnapshot = await admin
      .firestore()
      .collection(COLLECTIONS.USERS)
      .where("role", "==", "student")
      .get();

    const tokensToNotify = [];

    for (const studentDoc of studentsSnapshot.docs) {
      const studentData = studentDoc.data();
      const uid = studentDoc.id;

      // Check payment for current month
      const paymentSnapshot = await admin
        .firestore()
        .collection(COLLECTIONS.FEE_PAYMENTS)
        .where("studentId", "==", uid)
        .where("monthId", "==", monthId)
        .get();

      const isPaid = paymentSnapshot.docs.some((doc) => {
        const status = doc.data().paymentStatus;
        return status === "verified" || status === "submitted";
      });

      if (!isPaid && studentData.expoPushToken) {
        tokensToNotify.push(studentData.expoPushToken);
      }
    }

    if (tokensToNotify.length > 0) {
      await sendExpoPush(
        tokensToNotify,
        "Fee Due",
        `Your transport fee for ${currentMonth} is due.`,
        { type: "fee_reminder", role: "student" },
      );
    }

    return null;
  });

/**
 * Function 4 — onPaymentSubmitted:
 * Triggered on feePayments creation.
 */
exports.onPaymentSubmitted = functions.firestore
  .document("feePayments/{paymentId}")
  .onCreate(async (snapshot, context) => {
    const paymentData = snapshot.data();
    const paymentId = context.params.paymentId;

    const adminsSnapshot = await admin
      .firestore()
      .collection(COLLECTIONS.USERS)
      .where("role", "==", "admin")
      .get();

    const adminTokens = adminsSnapshot.docs
      .map((d) => d.data().expoPushToken)
      .filter((t) => !!t);

    if (adminTokens.length > 0) {
      await sendExpoPush(
        adminTokens,
        "Payment Received",
        `${paymentData.studentName} submitted ${paymentData.month} fee via ${paymentData.paymentMethod || "manual"}.`,
        { type: "payment_submitted", paymentId },
      );
    }
  });

/**
 * Function 5 — onPaymentVerified:
 * Triggered on feePayments update.
 */
exports.onPaymentVerified = functions.firestore
  .document("feePayments/{paymentId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    if (
      newData.paymentStatus === "verified" &&
      oldData.paymentStatus !== "verified"
    ) {
      const studentDoc = await admin
        .firestore()
        .collection(COLLECTIONS.USERS)
        .doc(newData.studentId)
        .get();
      const token = studentDoc.exists ? studentDoc.data().expoPushToken : null;

      if (token) {
        await sendExpoPush(
          [token],
          "Payment Verified",
          `Your ${newData.month} fee has been verified.`,
          { type: "payment_verified", role: "student" },
        );
      }
    }
  });

/**
 * Function 6 — onRideStarted:
 * Triggered on rides update.
 */
exports.onRideStarted = functions.firestore
  .document("rides/{rideId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const rideId = context.params.rideId;

    if (newData.status === "active" && oldData.status === "scheduled") {
      const routeId = newData.routeId;
      const routeDoc = await admin
        .firestore()
        .collection(COLLECTIONS.ROUTES)
        .doc(routeId)
        .get();

      if (!routeDoc.exists) return;
      const routeData = routeDoc.data();
      const studentIds = routeData.studentIds || [];

      const today = new Date().toISOString().split("T")[0];
      const tokensToNotify = [];

      for (const studentId of studentIds) {
        // Check availability for today
        const availabilitySnapshot = await admin
          .firestore()
          .collection(COLLECTIONS.AVAILABILITY)
          .where("userId", "==", studentId)
          .where("date", "==", today)
          .where("isAvailable", "==", true)
          .get();

        if (!availabilitySnapshot.empty) {
          const studentDoc = await admin
            .firestore()
            .collection(COLLECTIONS.USERS)
            .doc(studentId)
            .get();
          if (studentDoc.exists && studentDoc.data().expoPushToken) {
            tokensToNotify.push(studentDoc.data().expoPushToken);
          }
        }
      }

      if (tokensToNotify.length > 0) {
        await sendExpoPush(
          tokensToNotify,
          "Ride Started",
          `Driver ${newData.driverName} has started. Open to track.`,
          { type: "ride_started", rideId, role: "student" },
        );
      }
    }
  });
