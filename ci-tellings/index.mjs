'use strict';

const random = {
  getRandomInt(min, max) {
    // 这里应该使用 crypto 获取，而不是 Math.random
    const range = max - min + 1;
    const randomBuffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(randomBuffer);
    return min + (randomBuffer[0] % range);
  },
  choice(arr) {
    if (arr.length === 0) return null;
    const index = this.getRandomInt(0, arr.length - 1);
    return arr[index];
  }
}

// data
const data = {
  urls: {
    "telling.furieau.com": "https://myappsbucket.apps.furieau.com/internal/static/CI/Tellings.txt",
    "ci-telling.fc.furieau.com": "https://github.com/ClassIsland/ClassIsland/raw/refs/heads/master/ClassIsland/Assets/Tellings.txt",
  },
  user_types: [
    "hk3rd",
    "hk4e",
    "hkrpg",
    "zenlesszonezero",
  ],
  help_url: "https://myappsbucket.apps.furieau.com/internal/static/CI/Help.txt",
};
// data
export const handler = async (event, context) => {
  try {
    const json = JSON.parse(String(event))

    const domain = json.requestContext.domainName;
    const url = data.urls[domain];

    const text = await (await fetch(url)).text();

    if (json.rawPath === '/all') {
      return {
        statusCode: 200,
        headers: {
          'content-type': 'text/plain;charset=utf-8',
          'cache-control': 'no-store'
        },
        body: text
      };
    }

    const texts = (text).split('\n').filter(line => (((!!(line.trim()))) && (!(line.startsWith('#')))));
    // 随机选取一项，作为body返回，注意需要带上响应头 content-type: text/plain;charset=utf-8

    if (texts.length === 0) {
      throw new Error('No valid text entries found');
    }

    if (json.requestContext.http.path.startsWith('/@/')) try {
      // json.requestContext.http.path 被自动解码，而 json.rawPath 是 URL编码后的内容
      // 我们直接使用解码后的json.requestContext.http.path
      const d = JSON.parse((json.requestContext.http.path.substring(3)));

      if (d.acceptable !== true) throw 'unacceptable';
      const user_type = d.user_type;
      if (!(data.user_types.includes(user_type))) throw 'user mismatch';

      const useUser = !!d.use_user;

      if (useUser) {
        return {
          statusCode: 500,
          body: 'Not implemented yet'
        }
      }

      // 解析 help
      const help = d.show_help === true || d.command === 'help';
      if (help) {
        const help_text = await (await fetch(data.help_url)).text();
        return {
          statusCode: 200,
          headers: {
            'content-type': 'text/html;charset=utf-8',
            'cache-control': 'no-cache'
          },
          body: help_text
        };
      }

      // 解析 count
      const count = +d.count;
      if (!isNaN(count)) {
        // 处理 count
        const results = [];
        for (let i = 0; i < count; i++) {
          const selected = random.choice(texts);
          results.push(selected);
        }
        return {
          statusCode: 200,
          headers: {
            'content-type': 'text/plain;charset=utf-8',
            'cache-control': 'no-store'
          },
          body: results.join('\n')
        };
      }

      // 回到正常处理流程
    } catch (e) {
      return {
        statusCode: 400,
        headers: { 'content-type': 'text/plain;charset=utf-8' },
        body: 'Invalid or not acceptable JSON: ' + e
      };
    }

    const selected = random.choice(texts);

    return {
      statusCode: 200,
      headers: {
        'content-type': 'text/plain;charset=utf-8',
        'cache-control': 'no-store'
      },
      body: selected
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: `Server Error: ${error} ${error?.stack}`
    };
  }
}