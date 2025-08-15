'use strict';

const apis_list_text = `
/index/{}       Get index file
/versions/{}     Get all versions
/release_note/{}/{} Get release note
/download/{}/{}   Get download link
/latest/parse/{} Parse latest version number
/latest/parse[stable]/{} Parse latest stable version number
`;

export const handler = async (event, context) => {
    const eventObj = JSON.parse(event);
    console.log(`receive event: ${JSON.stringify(eventObj)}`);

    const path = eventObj.requestContext.http.path;
    if (!path || path.length < 2) return { statusCode: 400, body: 'invalid api call. Available API: ' + apis_list_text };

    const pathParts = path.substring(1).split('/'); // 以免开头的 “/” 干扰
    if (pathParts.length < 2) return { statusCode: 400, body: 'invalid path parts' };

    const apiName = pathParts[0];
    const appName = pathParts[1];
    if (!/^[a-zA-Z0-9_-]+$/.test(appName)) return {
        statusCode: 400,
        body: `app name malformed`
    };

    const base = new URL(process.env.service_endpoint);
    const getResp = async (file = 'index.json', argsCount = 2) => {
        if (pathParts.length != argsCount) throw {
            statusCode: 400,
            body: 'invalid argument count'
        }
        const resp = await fetch(new URL('/project/' + appName + '/' + file, base));
        if (!resp.ok) throw {
            statusCode: 404,
            body: 'Application not found, url= ' + (new URL('/project/' + appName + '/' + file, base)).href
        }
        return await resp.json();
    };

    try {
        switch (apiName) {
            case 'index': {
                // 获取内容
                const resp = await getResp();
                return resp;
            }
            case 'versions': {
                // 获取内容
                const resp = await getResp('versions.json');
                return resp;
            }
            case 'release_note':
            case 'download':
            {
                const resp = await getResp('versions.json', 3);
                const vid = pathParts[2];
                if (!Array.isArray(resp)) return {
                    statusCode: 500,
                    body: 'bad version file'
                };
                for (const v of resp) {
                    if (String(v.version) == vid) {
                        return {
                            statusCode: 200,
                            body: String(v[apiName])
                        };
                    }
                }
                return { statusCode: 404, body: 'version specified not found' };
            }
            case 'latest': {
                switch (pathParts[1]) {
                case 'parse':
                case 'parse[stable]': {
                    const resp = await getResp('index.json', 3);
                    return String(resp[(pathParts[1] == 'parse' ? 'latest' : 'latest.stable')])?.version;
                }
                default:
                    return { statusCode: 404, body: 'invalid api' };
                }
            }
                break;
            default:
                return { statusCode: 404, body: 'invalid api' };
        }
    }
    catch (e) {
        if (e.statusCode) return e;
        if (e instanceof SyntaxError) return { statusCode: 500, body: 'server: invalid json:\n' + e };
    }
    return { statusCode: 500, body: 'What a Terrible Fault' };
}