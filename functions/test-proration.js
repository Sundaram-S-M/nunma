const { getDaysInMonth } = require('date-fns');

// Mock data
const anchorDay = 31;
const monthlyPrice = 20;
const quantity = 1;

function testProration(currentDateStr) {
    const now = new Date(currentDateStr);
    const currentMonthDays = getDaysInMonth(now);

    let nextBillingDate;

    if (now.getDate() < anchorDay) {
        nextBillingDate = new Date(now.getFullYear(), now.getMonth(), anchorDay);
    } else {
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextMonthDays = getDaysInMonth(nextMonthDate);
        const validAnchorDay = Math.min(anchorDay, nextMonthDays);
        nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 1, validAnchorDay);
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysRemaining = Math.max(0, Math.ceil((nextBillingDate.getTime() - now.getTime()) / msPerDay));

    const initialCharge = (monthlyPrice / currentMonthDays) * daysRemaining * quantity;
    const proratedAddonCharge = parseFloat(initialCharge.toFixed(2));

    console.log(`Current Date: ${currentDateStr} | Month Days: ${currentMonthDays} | End Date: ${nextBillingDate.toISOString().split('T')[0]}`);
    console.log(`Remaining Days: ${daysRemaining} | Charge: $${proratedAddonCharge}\n`);
}

console.log("Testing with anchor day: 31\n");
testProration("2025-01-15T12:00:00Z"); // Jan has 31 days (anchor 31) -> Next is Jan 31
testProration("2025-01-31T12:00:00Z"); // Jan has 31 days (anchor 31) -> Next is Feb 28
testProration("2026-03-15T12:00:00Z"); // Mar has 31 days (anchor 31) -> Next is Mar 31
testProration("2026-03-31T12:00:00Z"); // Mar has 31 days (anchor 31) -> Next is Apr 30
testProration("2026-04-15T12:00:00Z"); // Apr has 30 days (anchor 31) -> Next is Apr 30
