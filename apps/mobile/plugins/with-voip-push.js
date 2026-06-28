/**
 * Plugin Expo maison : câble PushKit (appels entrants VoIP) dans l'AppDelegate iOS.
 *
 * Il n'existe pas de config plugin officiel pour react-native-voip-push-notification,
 * donc on injecte ici :
 *   - l'entitlement aps-environment (push),
 *   - les imports PushKit / VoipPushNotification / CallKeep,
 *   - l'enregistrement VoIP au lancement,
 *   - les méthodes PKPushRegistryDelegate (token + push entrant -> CallKit).
 *
 * ⚠️ Brique délicate, à valider sur appareil réel (itératif).
 */
const { withEntitlementsPlist, withAppDelegate } = require('@expo/config-plugins');

const IMPORTS = `#import "AppDelegate.h"
#import <PushKit/PushKit.h>
#import "RNVoipPushNotificationManager.h"
#import "RNCallKeep.h"`;

const REGISTER = `  [RNVoipPushNotificationManager voipRegistration];`;

const DELEGATE_METHODS = `
#pragma mark - PushKit (VoIP)

- (void)pushRegistry:(PKPushRegistry *)registry didUpdatePushCredentials:(PKPushCredentials *)credentials forType:(PKPushType)type {
  [RNVoipPushNotificationManager didUpdatePushCredentials:credentials forType:(NSString *)type];
}

- (void)pushRegistry:(PKPushRegistry *)registry didInvalidatePushTokenForType:(PKPushType)type {
}

- (void)pushRegistry:(PKPushRegistry *)registry didReceiveIncomingPushWithPayload:(PKPushPayload *)payload forType:(PKPushType)type withCompletionHandler:(void (^)(void))completion {
  NSDictionary *dic = payload.dictionaryPayload;
  NSString *uuid = [[NSUUID UUID] UUIDString];
  NSString *handle = @"Inconnu";
  NSString *callerName = @"Appel entrant";
  @try {
    NSDictionary *meta = dic[@"metadata"];
    if (meta && meta[@"caller_number"]) { handle = meta[@"caller_number"]; }
    if (meta && meta[@"caller_name"]) { callerName = meta[@"caller_name"]; }
  } @catch (NSException *e) {}

  [RNVoipPushNotificationManager addCompletionHandler:uuid completionHandler:completion];
  [RNVoipPushNotificationManager voipRegistration];
  [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload forType:(NSString *)type];

  [RNCallKeep reportNewIncomingCall:uuid
                             handle:handle
                         handleType:@"generic"
                           hasVideo:NO
                localizedCallerName:callerName
                    supportsHolding:YES
                       supportsDTMF:YES
                   supportsGrouping:YES
                 supportsUngrouping:YES
                        fromPushKit:YES
                            payload:dic
              withCompletionHandler:nil];
}

@end`;

function addImports(src) {
  if (src.includes('RNVoipPushNotificationManager.h')) return src;
  return src.replace('#import "AppDelegate.h"', IMPORTS);
}

function addRegistration(src) {
  if (src.includes('[RNVoipPushNotificationManager voipRegistration]')) return src;
  // Juste avant le `return [super application:application didFinishLaunchingWithOptions:` du didFinishLaunching.
  return src.replace(
    /return \[super application:application didFinishLaunchingWithOptions:launchOptions\];/,
    `${REGISTER}\n  return [super application:application didFinishLaunchingWithOptions:launchOptions];`,
  );
}

function addDelegateMethods(src) {
  if (src.includes('didReceiveIncomingPushWithPayload')) return src;
  // Remplace le dernier @end par nos méthodes + @end.
  const idx = src.lastIndexOf('@end');
  if (idx === -1) return src + DELEGATE_METHODS;
  return src.slice(0, idx) + DELEGATE_METHODS.trimStart();
}

module.exports = function withVoipPush(config) {
  config = withEntitlementsPlist(config, (c) => {
    c.modResults['aps-environment'] = 'production';
    return c;
  });

  config = withAppDelegate(config, (c) => {
    let src = c.modResults.contents;
    src = addImports(src);
    src = addRegistration(src);
    src = addDelegateMethods(src);
    c.modResults.contents = src;
    return c;
  });

  return config;
};
