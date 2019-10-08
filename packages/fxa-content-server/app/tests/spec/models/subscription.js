/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { assert } from 'chai';
import ResumeToken from 'models/resume-token';
import SubscriptionModel from 'models/subscription';
import Url from 'lib/url';
import WindowMock from '../../mocks/window';

describe('models/subscription', () => {
  let windowMock;

  beforeEach(() => {
    windowMock = new WindowMock();
  });

  it('has the correct defaults', () => {
    const model = new SubscriptionModel();

    assert.isNull(model.get('planId'));
    assert.isNull(model.get('productId'));
    assert.deepEqual(model.resumeTokenFields, ['planId', 'productId']);
  });

  it('populates model using options', () => {
    windowMock.location.search = 'foo=bar&plan_id=baz&qux=';
    windowMock.location.pathname = '/product/wibble';
    const model = new SubscriptionModel({
      planId: 'foo',
      productId: 'bar',
      window: windowMock,
    });

    assert.equal(model.get('planId'), 'foo');
    assert.equal(model.get('productId'), 'bar');
  });

  it('populates model using url params', () => {
    windowMock.location.search = 'foo=bar&plan_id=baz&qux=';
    windowMock.location.pathname = '/product/wibble';
    windowMock.location.search = Url.objToSearchString({
      resume: ResumeToken.stringify({
        planId: 'foo',
        productId: 'bar',
      }),
    });
    const model = new SubscriptionModel();

    assert.equal(model.get('planId'), 'baz');
    assert.equal(model.get('productId'), 'wibble');
  });

  it('populates model using resume token', () => {
    windowMock.location.search = Url.objToSearchString({
      resume: ResumeToken.stringify({
        planId: 'foo',
        productId: 'bar',
      }),
    });
    const model = new SubscriptionModel();

    assert.equal(model.get('planId'), 'foo');
    assert.equal(model.get('productId'), 'bar');
  });
});
