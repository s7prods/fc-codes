'use strict';
import { sign_url } from './sign.js';

export async function handler(event, context, callback) {
    const eventObj = JSON.parse(event);
    console.log(`receive event: ${JSON.stringify(eventObj)}`);

    let body;
    
    try {
        try { body = JSON.parse(eventObj.body); }
        catch { body = eventObj; if (!(body.captcha)) { throw 1; } }
    } catch {
        return callback(null, {
            'statusCode': 400,
            'body': {
                captcha: false,
                captcha_data: 'Bad request',
            }
        });
    }

    if (!body.captcha || !body.url || !body.bucket || !body.region)  {
        return callback(null, {
            'statusCode': 400,
            'body': {
                captcha: false,
                captcha_data: 'captcha or url or bucket or region is empty',
            }
        });
    }

    let result = false, resultDetails;
    try {
      const resp = await (await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: `secret=${process.env.secret}&response=${encodeURIComponent(body.captcha)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      })).text();
      result = !!JSON.parse(resp).success;
      resultDetails = resp;
    } catch(error) {
      result = false;
      resultDetails = String(error.stack);
    }

    let link = null;
    if (result) try {
        link = await sign_url(body.url, {
            access_key_id: process.env.ACCESS_KEY_ID,
            access_key_secret: process.env.ACCESS_KEY_SECRET,
            bucket: body.bucket,
            region: body.region,
            expires: +process.env.expiration,
            method: 'GET',
        });
    } catch (error) {
        link = String(error.stack);
    }

    callback(null, {
        'statusCode': 200,
        'body': {
            captcha: result,
            captcha_data: resultDetails,
            link,
            expiration: +process.env.expiration,
        }
    });
}

