import { MyPvit } from './lib/mypvit';

async function testMyPvit() {
  // Configuration provided by the user
  const codeUrl = '8T4UNT1OHIMZLJXC';
  const operationAccountCode = 'ACC_6931F8F3C8091';
  // WARNING: Replace with the real password before running
  const password = process.env.MYPVIT_PASSWORD || 'Intechgabon@241';

  console.log('Testing MyPvit API...');
  console.log(`Code URL: ${codeUrl}`);
  console.log(`Operation Account Code: ${operationAccountCode}`);
  
  const mypvit = new MyPvit(codeUrl);

  try {
    console.log('Attempting to renew secret...');
    const result = await mypvit.renewSecret(operationAccountCode, password);
    
    console.log('Success! Response:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('Secret:', result.secret);
    console.log('Expires in:', result.expires_in);

    // Test Payment
    console.log('\n-----------------------------------');
    console.log('Testing Payment Initiation...');
    
    // Create a unique reference (max 15 chars)
    // Date.now() is 13 digits, so we take the last 10 digits to be safe + prefix
    const uniqueId = Date.now().toString().slice(-10);
    const reference = `REF${uniqueId}`;
    
    console.log(`Using Reference: ${reference} (Length: ${reference.length})`);

    const paymentRequest = {
      amount: 600, // API requires > 500
      reference: reference,
      callback_url_code: 'CTUBP', // Provided by user
      customer_account_number: '077808864', // Provided by user
      merchant_operation_account_code: operationAccountCode,
      transaction_type: 'PAYMENT' as const,
      operator_code: 'AIRTEL_MONEY' as const,
      // description is removed as it's not in the spec
      free_info: 'Test'
    };

    console.log('Payment Request Data:', JSON.stringify(paymentRequest, null, 2));

    try {
      const paymentResult = await mypvit.initiatePayment(result.secret, paymentRequest);
      console.log('Payment Initiation Result:');
      console.log(JSON.stringify(paymentResult, null, 2));
    } catch (paymentError) {
      console.error('Payment Initiation Failed:');
      if (paymentError instanceof Error) {
        console.error(paymentError.message);
        // Try to log more details if available on the error object (custom property)
        console.error('Full error:', paymentError);
      } else {
        console.error(paymentError);
      }
    }
    
  } catch (error) {
    console.error('Test Failed:');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
  }
}

testMyPvit();
