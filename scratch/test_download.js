const fs = require('fs');
const path = require('path');

async function test() {
  const url = "https://cabify.s3.amazonaws.com/production/avatars/019db99038e1740e9fedc52373987492/photo.png?v=1786429853";
  console.log("Fetching", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    if (res.ok) {
       const arrayBuffer = await res.arrayBuffer();
       fs.writeFileSync('scratch/test_photo.png', Buffer.from(arrayBuffer));
       console.log("Saved photo!");
    }
  } catch (e) {
    console.log("Error", e);
  }
}
test();
