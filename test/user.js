
const chai = require('chai');
const chaiHttp = require('chai-http');
const { assert } = require('chai');
const server = require('../index');

const it = server; // dummy declaration for eslint
const describe = server; // dummy declaration for eslint

chai.should();
chai.use(chaiHttp);

const headerInfo = {
  'x-access-token': '',
};
const baseUrl = '/api/user/';
const user = {
  email: 'name@example.com',
  password: 'Pwd11111',
};

/*
* Test the /api/user route
*/

describe('/user routes', () => {
  it('it should register user', (done) => {
    chai.request(server)
      .post(`${baseUrl}register`)
      .set(headerInfo)
      .send(user)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('registerToken');
        assert.isString(res.body.registerToken);
        headerInfo['x-access-token'] = res.body.registerToken;
        done();
      });
  });

  it('it should authenticate user', (done) => {
    chai.request(server)
      .post(`${baseUrl}auth`)
      .set(headerInfo)
      .send(user)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('token');
        assert.isString(res.body.token);
        headerInfo['x-access-token'] = res.body.token;
        done();
      });
  });

  // it('it should confirm user registration', (done) => {
  //     const user = {
  //         'code':''
  //     };
  //     chai.request(server)
  //         .post(api+'register/confirm')
  //         .set(headerInfo)
  //         .send(user)
  //         .end((err, res) => {
  //         res.should.have.status(200);
  //         res.body.should.be.a('object');
  //         res.body.should.have.property('message');
  //         done();
  //     });
  // });

  it('it should update user', (done) => {
    const updateUser = {
      email: 'juanperez@example.com',
      cellphone: '541128750511',
      oauth: 'xxxxx',
      nationalId: 21345678,
      name: 'Juan',
      lastName: 'Perez',
      dob: '01/25/1995',
      residentialAddress: 'Home 123',
      residentialProvince: 'Washington',
      residentialCountry: 'USA',
      residentialZipCode: '12345',
    };
    chai.request(server)
      .post(`${baseUrl}update`)
      .set(headerInfo)
      .send(updateUser)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('fieldsUpdated');
        res.body.should.have.property('message');
        res.body.should.have.property('emailVerifying');
        assert.isObject(res.body.fieldsUpdated);
        assert.isString(res.body.message);
        assert.isBoolean(res.body.emailVerifying);
        done();
      });
  });

  // it('it should verify update user', (done) => {
  //     const user = {
  //         'code':''
  //     };
  //     chai.request(server)
  //         .post(api+'update/verify')
  //         .set(headerInfo)
  //         .send(user)
  //         .end((err, res) => {
  //         res.should.have.status(200);
  //         res.body.should.be.a('object');
  //         res.body.should.have.property('message');
  //         done();
  //     });
  // });

  it('it should reset user password', (done) => {
    const userEmail = {
      email: 'juanperez@example.com',
    };
    chai.request(server)
      .post(`${baseUrl}password/reset`)
      .set(headerInfo)
      .send(userEmail)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('message');
        assert.isString(res.body.message);
        done();
      });
  });

  // it('it should set new user password', (done) => {
  //     const user = {
  //         "tempPassword":"C01oBXMBlZ",
  //         "newPassword":"pwd11111",
  //         "cellphone":"541128750511"
  //     };
  //     chai.request(server)
  //         .post(api+'password/reset/update')
  //         .set(headerInfo)
  //         .send(user)
  //         .end((err, res) => {
  //         res.should.have.status(200);
  //         res.body.should.be.a('object');
  //         res.body.should.have.property('message');
  //         done();
  //         });
  // });

  it('it should get current user', (done) => {
    chai.request(server)
      .get(`${baseUrl}/query`)
      .set(headerInfo)
      .end((err, res) => {
        res.should.have.status(200);
        done();
      });
  });

  it('it should upload user images', (done) => {
    chai.request(server)
      .post(`${baseUrl}id/photos`)
      .set(headerInfo)
      .attach('idfrontUrl', './Images/test/test.jpg', 'test.jpg')
      .type('form')
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.have.property('message');
        assert.isString(res.body.message);
        done();
      });
  });

  it('it should add user payment method ', (done) => {
    const paymentMethodData = {
      type: 'creditcard',
      cardName: 'Juan Perez',
      cardNumber: '444433334442213',
      cardExpiration: '0224',
      cardCvv: '123',
    };
    chai.request(server)
      .post(`${baseUrl}payments/methods`)
      .set(headerInfo)
      .send(paymentMethodData)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('message');
        res.body.should.have.property('paymentMethodId');
        assert.isString(res.body.message);
        assert.isNumber(res.body.paymentMethodId);
        done();
      });
  });

  it('it should add user payment method ', (done) => {
    chai.request(server)
      .get(`${baseUrl}payments/methods`)
      .set(headerInfo)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('methods');
        assert.isArray(res.body.methods);
        done();
      });
  });
});
