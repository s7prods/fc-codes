'use strict';
import {sign_url} from './sign.js';


import CryptoJS from 'crypto-js';


const check_key = async (secret) => {
  try { return !!(await (await fetch(process.env.keyurl)).text()).split('\n').map(e=>e.trim()).filter(e=>!!e).includes(CryptoJS.SHA256(secret).toString(CryptoJS.enc.Hex)); }
  catch { return false; }
}

export const handler = async (event, context) => {
  event = JSON.parse(event);

  const ak = process.env.ak,
        sk = process.env.sk;
  const url_base = process.env.url;

  let path = event.rawPath || '';
  if (path.length > 1) path = path.substring(1);
  const method = event.requestContext.http.method;

  if (method === 'OPTIONS') {
    return {
      'statusCode': 200,
      'body': '',
      'headers': {
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  }

  if (method === 'GET') {
    if (path === 'generate') {
      return {
        'statusCode': 307,
        headers: {

          'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Location': process.env.gurl,
        }
      }
    }
    else if (!path || path == '/') {
      return { statusCode: 400, headers: {
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      } }
    }

    const resp = (await fetch(url_base + path));
    if (!resp.ok) return {
      'statusCode': resp.status,
      'body': await resp.text(),
      'headers': {
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }

    // redirect
    return {
      'statusCode': 307,
      headers: {
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Location': await resp.text(),
      }
    }
  }

  // put or delete
  const key = event.queryParameters?.secret || '';
  if (!await check_key(key)) {
    return {
      'statusCode': 401,
      'body': 'Not authorized',
      'headers': {
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  }

  if (!path || path == '/') return {
    'statusCode': 400,
    'body': 'Bad Request',
    'headers': {
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  }

  const target_object = url_base + path;
  try {
    const ahl = (method === 'PUT') ? ({
      'Content-Type': event.headers['Content-Type'] || '',
    }) : {};
    const u = await sign_url(target_object, {
      access_key_id: ak,
      access_key_secret: sk,
      bucket: process.env.bucket,
      region: process.env.region,
      method,
      expires: 60,
      additionalHeadersList: ahl,
    });
    return {
      'statusCode': 307,
      headers: { 
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Location': u,
      }
    }
  } catch (e) {
    return {
      'statusCode': 500,
      'body': String(e?.stack || e),
      'headers': {
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  }
}