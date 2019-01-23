/* Provide functionality for authentication buttons */
/* global URL, location, alert, solid */

(({ auth }, $rdf) => {
  // Wire up DOM elements
  const [loginButton, logoutButton, registerButton, accountSettings] =
    ['login', 'logout', 'register', 'account-settings'].map(id =>
      document.getElementById(id) || document.createElement('a'))
  loginButton.addEventListener('click', login)
  logoutButton.addEventListener('click', logout)
  registerButton.addEventListener('click', register)
  if ($rdf) {
    document.addEventListener('DOMContentLoaded', getAccountInfo)
  }

  // Track authentication status and update UI
  auth.trackSession(session => {
    const loggedIn = !!session
    const isOwner = loggedIn && new URL(session.webId).origin === location.origin
    loginButton.classList.toggle('hidden', loggedIn)
    logoutButton.classList.toggle('hidden', !loggedIn)
    registerButton.classList.toggle('hidden', loggedIn)
    accountSettings.classList.toggle('hidden', !isOwner)
  })

  // Log the user in on the client and the server
  async function login () {
    const session = await auth.popupLogin()
    if (session) {
      // Make authenticated request to the server to establish a session cookie
      const {status} = await auth.fetch(location, { method: 'HEAD' })
      if (status === 401) {
        alert(`Invalid login.\n\nDid you set ${session.idp} as your OIDC provider in your profile ${session.webId}?`)
        await auth.logout()
      }
      // Now that we have a cookie, reload to display the authenticated page
      location.reload()
    }
  }

  // Log the user out from the client and the server
  async function logout () {
    await auth.logout()
    location.reload()
  }

  // Redirect to the registration page
  function register () {
    const registration = new URL('/register', location)
    registration.searchParams.set('returnToUrl', location)
    location.href = registration
  }

  async function getAccountInfo () {
    const SOLID = $rdf.Namespace('http://www.w3.org/ns/solid/terms#')

    // get DOM and data-dependencies
    const storagePanel = document.getElementById('StoragePanel')
    const storageQuota = document.getElementById('StorageQuota')
    const storageUsage = document.getElementById('StorageUsage')
    const storageUsedBar = document.getElementById('StorageUsedBar')
    if (!storagePanel || !storageQuota || !storageUsage || !storageUsedBar) {
      // If anything of these elements are not available, we do not need to do anything more
      return
    }

    // load data
    const accountUrl = new URL('/account', location).href
    const accountStore = $rdf.graph()
    const accountFetcher = new $rdf.Fetcher(accountStore)
    await accountFetcher.load(accountUrl)
    const quotaNode = accountStore.any($rdf.sym(accountUrl), SOLID('storageQuota'))
    const usageNode = accountStore.any($rdf.sym(accountUrl), SOLID('storageUsage'))
    if (!quotaNode || !usageNode) {
      // If data is not available, we do not need to do anything more
      return
    }

    // manipulate DOM to present data
    storagePanel.classList.remove('hidden')
    const quotaValue = quotaNode.value
    storageQuota.innerText = formatBytes(quotaValue)
    const usageValue = usageNode.value
    storageUsage.innerText = formatBytes(usageValue)
    const usagePercent = Math.floor(usageValue / quotaValue * 1000) / 10
    storageUsedBar.innerText = `${usagePercent}%`
    storageUsedBar.setAttribute('aria-valuenow', usagePercent)
    storageUsedBar.style.width = `${usagePercent}%`
  }

  function formatBytes (number, units = [
    'B',
    'kB',
    'MB',
    'GB',
    'TB',
    'PB',
    'EB',
    'ZB',
    'YB'
  ]) {
    const unit = units.shift()
    if (number > 1000 && units.length > 0) {
      return formatBytes(number / 1000, units)
    }
    return `${Math.round(number * 100) / 100} ${unit}`
  }
})(solid, window.$rdf)
