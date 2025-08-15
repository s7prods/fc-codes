'use strict';
import { sign_url } from './sign.js';

import Captcha20230305, * as $Captcha20230305 from '@alicloud/captcha20230305';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';

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

    let config = new $OpenApi.Config({});
    config.accessKeyId = process.env.ACCESS_KEY_ID;
    config.accessKeySecret = process.env.ACCESS_KEY_SECRET;

    //设置请求地址 国内调用地址 captcha.cn-shanghai.aliyuncs.com   新加坡调用地址 captcha.ap-southeast-1.aliyuncs.com
    config.endpoint = "captcha.cn-shanghai.aliyuncs.com";
    // 设置连接超时为5000毫秒
    config.connectTimeout = 5000;
    // 设置读超时为5000毫秒
    config.readTimeout = 5000;

    // ====================== 2. 初始化客户端（实际生产代码中建议复用client） ====================== 
    //console.log(Captcha20230305)
    let client = new Captcha20230305.default(config);
    let request = new $Captcha20230305.VerifyIntelligentCaptchaRequest({});
    request.sceneId = "1p7enydb";
    request.captchaVerifyParam = body.captcha;
    console.log(body.captcha)

    // ====================== 3. 发起请求） ====================== 
    let result = false, resultDetails;
    try {
        let resp = await client.verifyIntelligentCaptcha(request);
        resultDetails = JSON.stringify(resp.body);
        // 建议使用您系统中的日志组件，打印返回
        // 获取验证码验证结果（请注意判空），将结果返回给前端。出现异常建议认为验证通过，优先保证业务可用，然后尽快排查异常原因。
        result = resp.body.result.verifyResult;
        // 原因code
        // let captchaVerifyCode = resp.body.result.verifyCode;
    } catch (error) {
        // 建议使用您系统中的日志组件，打印异常
        // 出现异常建议认为验证通过，优先保证业务可用，然后尽快排查异常原因。
        console.error(error)
        resultDetails = String(error);
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

