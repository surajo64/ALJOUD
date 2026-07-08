/**
 * ONE-TIME FIX: Reset patients with negative deposit balances.
 *
 * The old bedFeeBilling.js had a 50,000 "credit limit" that allowed
 * auto-pay to deduct ward charges even when the patient had no funds,
 * pushing the balance deep into negatives.
 *
 * This script resets any negative depositBalance to 0.
 * The unpaid charges remain as 'pending' – cashier collects manually.
 *
 * Run: node scripts/fixNegativeDeposits.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Patient = require('../models/patientModel');

const MONGO_URI = process.env.MONGO_URI;

(async () => {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB\n');

    const negativePatients = await Patient.find({ depositBalance: { $lt: 0 } });

    if (negativePatients.length === 0) {
        console.log('No patients with negative deposit balance found. Nothing to fix.');
        await mongoose.disconnect();
        return;
    }

    console.log(`Found ${negativePatients.length} patient(s) with negative balance:\n`);

    for (const p of negativePatients) {
        const old = p.depositBalance;
        p.depositBalance = 0;
        await p.save();
        console.log(`  ✓ ${p.name} (MRN: ${p.mrn})  |  ${old}  →  0`);
    }

    console.log('\n✅ Done. All negative balances have been reset to 0.');
    console.log('   Pending bed-fee charges remain unpaid — collect via cashier.');
    await mongoose.disconnect();
})().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
