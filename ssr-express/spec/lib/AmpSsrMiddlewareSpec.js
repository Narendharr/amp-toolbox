/**
 * Copyright 2018 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const MockExpressRequest = require('mock-express-request');
const MockExpressResponse = require('mock-express-response');
const AmpSsrMiddleware = require('../../lib/AmpSsrMiddleware');

class TestTransformer {
  transformHtml(body, options) {
    return Promise.resolve('transformed: ' + options.ampUrl);
  }
}

function runMiddlewareForUrl(middleware, url, accepts = () => 'html') {
  return new Promise(resolve => {
    const mockResponse = new MockExpressResponse();
    const next = () => mockResponse.send('original');
    const mockRequest = new MockExpressRequest({
      url: url
    });
    mockRequest.accepts = accepts;

    const end = mockResponse.end;
    mockResponse.end = chunks => {
      mockResponse.end = end;
      mockResponse.end(chunks);
      resolve(mockResponse._getString());
    };
    middleware(mockRequest, mockResponse, next);
  });
}

describe('Express Middleware', () => {
  describe('Default configuration', () => {
    const middleware = AmpSsrMiddleware.create({ampSsr: new TestTransformer()});

    it('Transforms URLs', () => {
      runMiddlewareForUrl(middleware, '/stuff?q=thing')
        .then(result => {
          expect(result).toEqual('transformed: /stuff?q=thing&amp=');
        });
    });

    it('Skips Urls starting with "/amp/"', () => {
      runMiddlewareForUrl(middleware, '/amp/stuff?q=thing&amp')
        .then(result => {
          expect(result).toEqual('original');
        });
    });

    it('Skips Resource Requests', () => {
      const staticResources = ['/image.jpg', '/image.svg', '/script.js', '/style.css'];
      const runStaticTest = url => {
        runMiddlewareForUrl(middleware, url)
          .then(result => {
            expect(result).toEqual('original');
          });
      };
      staticResources.forEach(url => runStaticTest(url));
    });

    it('Applies transformation is accept method does not exist', () => {
      runMiddlewareForUrl(middleware, '/page.html', null)
        .then(result => {
          expect(result).toEqual('transformed: /page.html?amp=');
        });
    });

    it('Skips transformation if request does not accept HTML', () => {
      runMiddlewareForUrl(middleware, '/page.html', () => '')
        .then(result => {
          expect(result).toEqual('original');
        });
    });
  });
});
