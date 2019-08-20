/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import _ from 'underscore';
import Cocktail from 'cocktail';
import FormView from './form';
import ServiceMixin from './mixins/service-mixin';
import Template from 'templates/confirm_signup_code.mustache';

const CODE_INPUT_SELECTOR = 'input.token-code';

const proto = FormView.prototype;

class ConfirmSignupCodeView extends FormView {
  template = Template;
  className = 'confirm-signup-code';

  initialize(options = {}) {
    // Account data is passed in from sign up and sign in flows.
    // It's important for Sync flows where account data holds
    // ephemeral properties like unwrapBKey and keyFetchToken
    // that need to be sent to the browser.
    this._account = this.user.initAccount(this.model.get('account'));
  }

  afterVisible() {
    // the view is always rendered, but the confirmation may be
    // prevented by the broker.
    const account = this.getAccount();
    return proto.afterVisible
      .call(this)
      .then(() => this.broker.persistVerificationData(account))
      .then(() =>
        this.invokeBrokerMethod('beforeSignUpConfirmationPoll', account)
      );
  }

  getAccount() {
    return this._account;
  }

  setInitialContext(context) {
    const email = this.getAccount().get('email');

    context.set({
      email,
      escapedEmail: `<span class="email">${_.escape(email)}</span>`,
    });
  }

  beforeRender() {
    // User cannot confirm if they have not initiated a sign up.
    if (!this.getAccount().get('sessionToken')) {
      this.navigate('signup');
    }
  }

  _gotoNextScreen() {
    return Promise.resolve().then(() => {
      const account = this.getAccount();
      this.logViewEvent('verification.success');
      this.notifier.trigger('verification.success');
      return this.invokeBrokerMethod('afterSignUpConfirmationPoll', account);
    });
  }

  resend() {
    // FIXME
  }

  submit() {
    const account = this.getAccount();
    const code = this.getElementValue(CODE_INPUT_SELECTOR);
    return account.verifySessionCode(code).then(() => this._gotoNextScreen());
  }
}

Cocktail.mixin(ConfirmSignupCodeView, ServiceMixin);

export default ConfirmSignupCodeView;
