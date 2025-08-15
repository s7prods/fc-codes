exports.handler = (event, context, callback) => {
  event = JSON.parse(event);
  const path = event.rawPath || '';
  let target;
  
  // 设置重定向规则
  if (path === ('/1')) {
    target = '/2';
  } else if (path === ('/2')) {
    target = '/1';
  } else if (path === ('/') || !path) {
    target = '/1';
  } else {
    // 非测试路径返回 400
    return callback(null, {
      statusCode: 404,
      body: ''
    });
  }

  // 构造重定向响应
  const response = {
    statusCode: 302,
    headers: {
      'Location': target,
    },
  };

  callback(null, response);
};