const bcrypt = require('bcrypt');

const senhaDigitada = 'baiano00';
const hashSalvo = '$2b$12$NXswnUDpSn2FTIqdhA4yBOGehgoYn4Ao1Ck7ZidQlQRMQF/55GGc.';

bcrypt.compare(senhaDigitada, hashSalvo, function(err, result) {
 if (result) {
 console.log('Senha correta!');
 } else {
 console.log('Senha incorreta!');
 }
});