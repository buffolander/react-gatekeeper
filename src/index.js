import decodeJWT from 'jwt-decode'

/**
 * Class representing a Gatekeeper.
 * @constructor
 * @property {string} rootClaimsProperty: The root property key for users' claims within their JWT access tokens.
 * #defaultValue: null
 * @property {string} claimOrgTypeProp: The orgType property key within each claim.
 * #defaultValue: 'organizationType'
 * @property {string} claimOrgRoleProp: The orgRole property key within each claim.
 * #defaultValue: 'role'
 */
export default class Gatekeeper {
  constructor({
    rootClaimsProperty = null,
    claimOrgTypeProp = 'organizationType',
    claimOrgRoleProp = 'role',
  }) {
    this.rootClaimsProperty = rootClaimsProperty
    this.claimOrgTypeProp = claimOrgTypeProp
    this.claimOrgRoleProp = claimOrgRoleProp
    this.rules = {}
    this.userRoles = []
  }

  addRule({
    route,
    whitelist = [],
  }) {
    const nWhitelist = whitelist.map((item) => (typeof item === 'string'
      ? item
      : `${item.organizationType}:${item.role}`))
    this.rules = {
      ...this.rules,
      [route]: nWhitelist,
    }
  }

  setUserToken(userToken) {
    try {
      const decodedToken = decodeJWT(userToken)
      const claims = !this.rootClaimsProperty
        ? decodedToken
        : decodedToken[this.rootClaimsProperty]
      const userRoles = Array.isArray(claims)
        ? claims.map((claim) => (`${claim[this.claimOrgTypeProp]}:${claim[this.claimOrgRoleProp] || '*'}`))
        : [`${claims[this.claimOrgTypeProp]}:${claims[this.claimOrgRoleProp] || '*'}`]
      this.userRoles = userRoles
    } catch (err) {
      this.userRoles = []
    }
  }

  routeGate(route) {
    try {
      const authdRouteRoles = this.rules[route]
      if (!authdRouteRoles) return true
      /* route not found in rules; therefore route is public */

      const authdUserRoles = this.userRoles
        .reduce((acc, cur) => {
          const [userOrgType, userRole] = cur.split(':')
          const authdMatches = authdRouteRoles.filter((item) => {
            const [routeOrgType, routeRole] = item.split(':')
            return (routeOrgType === '*' || routeOrgType === userOrgType)
              && (userRole === '*' || routeRole === '*' || userRole === routeRole)
          })
          return authdMatches.length
            ? [...acc, cur]
            : acc
        }, [])

      return authdUserRoles.length
        ? authdUserRoles
        : false
    } catch (err) {
      return false
    }
  }

  componentGate(whitelist = [], component) {
    const authdUserRoles = this.userRoles
      .reduce((acc, cur) => {
        const [userOrgType, userRole] = cur.split(':')
        const authdMatches = whitelist.filter((item) => {
          const [routeOrgType, routeRole] = item.split(':')
          return (routeOrgType === '*' || routeOrgType === userOrgType)
            && (userRole === '*' || routeRole === '*' || userRole === routeRole)
        })
        return authdMatches.length
          ? [...acc, cur]
          : acc
      }, [])
    return authdUserRoles.length
      ? component
      : ''
  }
}
