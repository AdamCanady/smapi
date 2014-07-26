// SERPmetrics Node.JS SDK
// by Adam Canady, July 2014

var request  = require('request'),
    crypto   = require('crypto'),
    url      = require('url'),
    _        = require('lodash');

exports.SMapi = function (credentials, rate_limit, timeout) {
    return {
        VERSION: 'v1.0.0',

        apiUrl: url.parse('http://api.serpmetrics.com'),
        userAgent: 'SERPmetrics Node.JS Library',
        timeout: typeof timeout !== 'undefined' ? timeout : 5000,

        credentials: credentials,

        rate_limit: typeof timeout !== 'undefined' ? timeout : 30, // requests per second
        milliseconds_per_request: 60000/rate_limit,
    /*    Adds a new keyword to the queue. engines should be passed as a list
     *    of {engine}_{locale} strings.
     *
     *        Also takes a list of keyword strings
     *
     *    Ex. ["google_en-us", "yahoo_en-us", "bing_en-us"]
     *
     *    @param string or list keyword
     *    @param list engines
     *    @return mixed
     */
        add: function (keyword, engines, cb) {
            if (!(engines instanceof Array)) {
                engines = [engines];
            }

            var options = {
                'path': '/keywords/add', 
                'params': {
                    'keyword': keyword,
                    'engines': engines
                }
            } ;

            return this.rest(options, cb);
        },

    /*    Removes a keyword from the queue.
     *    Note: this REMOVES a keyword entirely, including ALL engines assigned. To update
     *            a keywords engine list, simply call add() with the new engine list
     *
     *            Also takes a list of keyword_id strings.
     *
     *    @param string or list keywordId
     *    @return mixed
     */
        remove: function (keywordId, cb) {
            var options = {
                'path': '/keywords/delete', 
                'params': {
                    'keyword_id': keywordId
                }
            };

            return this.rest(options, cb);
        },

    /*
     *    Adds a new keyword to the priority queue, usage as per add()
     */
        priorityAdd: function (keyword, engines, cb) {
            if (!(engines instanceof Array)) {
                engines = [engines];
            }
            
            var options = {
                'path': '/priority/add', 
                'params': {
                    'keyword': keyword, 
                    'engines': engines
                }
            };

            return this.rest(options, cb);
        },

    /*    Gets status for a given priority_id
     *
     *    @param string priority_id
     *    @return mixed
     */
        priorityStatus: function (priorityId, cb) {
            var options = {
                'path': '/priority/status', 
                'params': {
                    'priority_id': priorityId
                }
            };

            return this.rest(options, cb);
        },

    /*    Gets last limit SERP check timestamps/ids for keyword/engine combination. engine
     *    should be in the format {engine}_{locale} (for example google_en-us).
     *
     *    @param string keyword_id
     *    @param string engine
     *    @param integer limit (optional)
     *    @return dict
     */
        check: function (keywordId, engine, limit, cb) {
            limit = typeof limit !== 'undefined' ?  limit : 10;

            var options = {
                'path':'/keywords/check', 
                'params':{
                    'keyword_id': keywordId, 
                    'engine': engine, 
                    'limit': limit
                },
                'method': 'GET'
            };

            return this.rest(options, cb);
        },

    /*    Get SERP data for given id. Restricted to optional specified domain
     *
     *    @param string id
     *    @param string domain
     *    @return mixed
     */
        serp: function (checkId, domain, cb) {
            var options = {
                'path': '/keywords/serp', 
                'params': {
                    'check_id': checkId, 
                    'domain': domain
                }
            };

            return this.rest(options, cb);

        },

    /*    Get current credit balance
     *
     *    @return mixed
     */
        credit: function (cb) {
            var options = {
                'path': '/users/credit'
            };

            return this.rest(options, cb);
        },

    /*    Get trended flux data for a given engine_code
     *
     *    @param string engine_code
     *    @param string type
     *    @return mixed
     */
        flux: function (engineCode, _type, cb) {
            _type = typeof _type !== 'undefined' ?  _type : 'daily';

            var options = {
                'path': '/flux/trend', 
                'params': {
                    'engine_code': engineCode, 
                    'type': _type
                }
            };

            return this.rest(options, cb);
        },

    /*    Generates authentication signature
     *
     *    @param dict credentials
     *    @return dict
     */
        _generateSignature: function (credentials) {
            var ts = parseInt(new Date() / 1000, 10);

            if (typeof credentials == 'undefined' || credentials.length === 0) {
                credentials = this.credentials;
            }

            var signature = crypto
                .createHmac('sha256', credentials.secret)
                .update(ts.toString())
                .digest('base64');

            return {
                'ts':ts, 
                'signature':signature
            };
        },

    /*    Generates a REST request to the API with retries and exponential backoff
     *
     *    @param dict options
     *    @param dict credentials
     *    @return mixed
     */
        rest: _.throttle(function (options, credentials, cb) {
            var defaults = {
                'method': 'POST',
                'url': this.apiUrl,
                'path': '/' 
            };

            for (var attrname in options) { 
                defaults[attrname] = options[attrname]; 
            }

            options = defaults;

            var params;
            if (typeof options.params !== 'undefined') {
                params = options.params;
            } else {
                params = {};
            }

            if (typeof credentials == 'undefined' || credentials.length === 0) {
                credentials = this.credentials;
            }

            var auth = this._generateSignature(credentials);

            options.query = {
                'key':       credentials.key,
                'auth':      auth.signature,
                'ts':        auth.ts,
                'params':    params 
            };

            var reqData = {
                'params':    options.query.params,
                'key':       options.query.key,
                'auth':      options.query.auth,
                'ts':        options.query.ts 
            };

            var curUrl = this.url;
            var reqOptions;

            if (options.method == 'GET') {
                curUrl.query = reqData;

                reqOptions = {
                    url: url.format(curUrl),
                    method: 'GET'
                };
            } else {
                reqOptions = {
                    url: url.format(curUrl),
                    method: 'POST',
                    headers: {
                        'User-Agent': this.userAgent+' '+this.VERSION
                    },
                    json: reqData
                };
            }

            reqOptions.timeout = this.timeout;
            return request(reqOptions, cb);
        }, this.milliseconds_per_request)
    };
};
