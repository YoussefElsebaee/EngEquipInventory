const bcrypt = require('bcryptjs');

async function hashPassword() {
  const plainTextPassword = 'aaaaaaaaa'; // Replace with your desired password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(plainTextPassword, saltRounds);
  console.log('Hashed Password:', hashedPassword);
}

hashPassword();
