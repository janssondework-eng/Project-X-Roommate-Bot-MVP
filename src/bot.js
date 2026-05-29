export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("«X» Roommate Bot is running v4.6 Mutual Match + Moderation Comments + Language Switch");
    }

    let update;

    try {
      update = await request.json();
    } catch (error) {
      console.error("Invalid update:", error);
      return new Response("ok");
    }

    ctx.waitUntil(handleUpdate(update, env));

    return new Response("ok");
  }
};

async function handleUpdate(update, env) {
  try {
    if (update.callback_query) {
      await handleCallback(update.callback_query, env);
      return;
    }

    if (update.message) {
      await handleMessage(update.message, env);
      return;
    }
  } catch (error) {
    console.error("Bot error:", error);
  }
}

async function handleMessage(message, env) {
  const chatId = message.chat.id;
  const text = (message.text || message.caption || "").trim();
  const username = message.from?.username || null;
  const photoFileId = getLargestPhotoFileId(message);

  await upsertUser(message.from, env);

  if (text === "/cancel") {
    await clearSession(chatId, env);
    await sendMessage(chatId, "Действие отменено ✅", env, await mainMenuKeyboard(chatId, env));
    return;
  }

  if (text.startsWith("/")) {
    await clearSession(chatId, env);
  }

  if (text === "/start") {
    await sendMainMenu(chatId, env);
    return;
  }

  if (text === "/help") {
    await sendHelp(chatId, env);
    return;
  }

  if (text === "/id") {
    await sendMessage(chatId, `Твой Telegram ID:\n${chatId}`, env);
    return;
  }

  if (text === "/profile") {
    await startProfileCreation(chatId, env);
    return;
  }

  if (text === "/me") {
    await showMyProfile(chatId, env);
    return;
  }

  if (text === "/find") {
    await startSearchWithSavedPreferences(chatId, env);
    return;
  }

  if (text === "/preferences") {
    await showSearchPreferences(chatId, env);
    return;
  }

  if (text === "/favorites") {
    await startFavorites(chatId, env);
    return;
  }

  if (text === "/language") {
    await showLanguageMenu(chatId, env);
    return;
  }

  if (text === "/found") {
    await confirmFoundRoommate(chatId, env);
    return;
  }

  if (text === "/admin") {
    if (!(await isAdmin(chatId, env))) {
      await sendMessage(chatId, "Эта команда доступна только администратору.", env);
      return;
    }

    await showAdminPanel(chatId, env);
    return;
  }

  if (text === "/reports") {
    if (!(await isAdmin(chatId, env))) {
      await sendMessage(chatId, "Эта команда доступна только администратору.", env);
      return;
    }

    await startAdminReports(chatId, env);
    return;
  }

  if (text === "/analytics") {
    if (!(await isAdmin(chatId, env))) {
      await sendMessage(chatId, "Эта команда доступна только администратору.", env);
      return;
    }

    await showAdvancedAnalytics(chatId, env);
    return;
  }

  if (text === "/broadcast") {
    if (!(await isAdmin(chatId, env))) {
      await sendMessage(chatId, "Эта команда доступна только администратору.", env);
      return;
    }

    await startBroadcastDraft(chatId, env);
    return;
  }

  if (text === "/verification_requests") {
    if (!(await isAdmin(chatId, env))) {
      await sendMessage(chatId, "Эта команда доступна только администратору.", env);
      return;
    }

    await startAdminVerificationRequests(chatId, env);
    return;
  }

  if (text === "/mvp_report") {
    if (!(await isAdmin(chatId, env))) {
      await sendMessage(chatId, "Эта команда доступна только администратору.", env);
      return;
    }

    await exportMvpReport(chatId, env);
    return;
  }

  if (text === "/edit") {
    await showEditMenu(chatId, env);
    return;
  }

  if (text === "/delete") {
    await confirmDelete(chatId, env);
    return;
  }

  if (text === "/stats") {
    if (!(await isAdmin(chatId, env))) {
      await sendMessage(chatId, "Эта команда доступна только администратору.", env);
      return;
    }

    await showStats(chatId, env);
    return;
  }

  if (text === "/moderation") {
    if (!(await isAdmin(chatId, env))) {
      await sendMessage(chatId, "Эта команда доступна только администратору.", env);
      return;
    }

    await showPendingProfile(chatId, env);
    return;
  }

  if (text === "/export") {
    if (!(await isAdmin(chatId, env))) {
      await sendMessage(chatId, "Эта команда доступна только администратору.", env);
      return;
    }

    await exportProfilesCsv(chatId, env);
    return;
  }

  const quickAction = getQuickAction(text);

  if (quickAction) {
    await clearSession(chatId, env);

    if (quickAction === "menu") {
      await sendMainMenu(chatId, env);
      return;
    }

    if (quickAction === "find") {
      await startSearchWithSavedPreferences(chatId, env);
      return;
    }

    if (quickAction === "me") {
      await showMyProfile(chatId, env);
      return;
    }

    if (quickAction === "edit") {
      await showEditMenu(chatId, env);
      return;
    }

    if (quickAction === "preferences") {
      await showSearchPreferences(chatId, env);
      return;
    }

    if (quickAction === "favorites") {
      await startFavorites(chatId, env);
      return;
    }

    if (quickAction === "language") {
      await showLanguageMenu(chatId, env);
      return;
    }

    if (quickAction === "found") {
      await confirmFoundRoommate(chatId, env);
      return;
    }

    if (quickAction === "more") {
      await showMoreMenu(chatId, env);
      return;
    }

    if (quickAction === "admin") {
      if (!(await isAdmin(chatId, env))) {
        await sendMessage(chatId, "Эта кнопка доступна только администратору.", env);
        return;
      }

      await showAdminPanel(chatId, env);
      return;
    }

    if (quickAction === "help") {
      await sendHelp(chatId, env);
      return;
    }
  }

  const session = await getSession(chatId, env);

  if (!session) {
    await sendMessage(chatId, "Выбери действие в меню ниже 👇", env, await mainMenuKeyboard(chatId, env));
    return;
  }

  if (session.step === "search_results") {
    await sendMessage(
      chatId,
      "Ты сейчас в режиме поиска. Нажми кнопку ниже или вернись в меню.",
      env,
      {
        inline_keyboard: [
          [{ text: "➡️ Следующая анкета", callback_data: "find_next" }],
          [{ text: "⚙️ Изменить предпочтения", callback_data: "set_preferences" }],
          [{ text: "🔄 Искать без фильтров", callback_data: "find_no_filters" }],
          [{ text: "⬅️ В меню", callback_data: "menu" }]
        ]
      }
    );
    return;
  }

  if (session.step === "favorites_results") {
    await sendMessage(
      chatId,
      "Ты сейчас в избранном. Нажми кнопку ниже или вернись в меню.",
      env,
      {
        inline_keyboard: [
          [{ text: "➡️ Следующая избранная", callback_data: "favorite_next" }],
          [{ text: "⬅️ В меню", callback_data: "menu" }]
        ]
      }
    );
    return;
  }

  if (session.step === "admin_reports_results") {
    if (!(await isAdmin(chatId, env))) {
      await clearSession(chatId, env);
      await sendMessage(chatId, "Этот раздел доступен только администратору.", env);
      return;
    }

    await sendMessage(
      chatId,
      "Ты сейчас в разделе жалоб. Нажми кнопку ниже или вернись в админ-панель.",
      env,
      {
        inline_keyboard: [
          [{ text: "➡️ Следующая жалоба", callback_data: "admin_reports_next" }],
          [{ text: "🧰 Админ-панель", callback_data: "admin_panel" }],
          [{ text: "⬅️ В меню", callback_data: "menu" }]
        ]
      }
    );
    return;
  }

  if (session.step === "admin_verification_requests") {
    if (!(await isAdmin(chatId, env))) {
      await clearSession(chatId, env);
      await sendMessage(chatId, "Этот раздел доступен только администратору.", env);
      return;
    }

    await sendMessage(
      chatId,
      "Ты сейчас в разделе заявок на проверку. Нажми кнопку ниже или вернись в админ-панель.",
      env,
      {
        inline_keyboard: [
          [{ text: "➡️ Следующая заявка", callback_data: "admin_verification_next" }],
          [{ text: "🧰 Админ-панель", callback_data: "admin_panel" }],
          [{ text: "⬅️ В меню", callback_data: "menu" }]
        ]
      }
    );
    return;
  }

  if (session.step === "admin_moderation_comment") {
    if (!(await isAdmin(chatId, env))) {
      await clearSession(chatId, env);
      await sendMessage(chatId, "Этот раздел доступен только администратору.", env);
      return;
    }

    await saveModerationComment(chatId, text, session, env);
    return;
  }

  if (session.step === "admin_broadcast_text") {
    if (!(await isAdmin(chatId, env))) {
      await clearSession(chatId, env);
      await sendMessage(chatId, "Этот раздел доступен только администратору.", env);
      return;
    }

    await processBroadcastText(chatId, text, env);
    return;
  }

  if (session.step === "admin_broadcast_confirm") {
    if (!(await isAdmin(chatId, env))) {
      await clearSession(chatId, env);
      await sendMessage(chatId, "Этот раздел доступен только администратору.", env);
      return;
    }

    await sendMessage(
      chatId,
      "Рассылка готова. Используй кнопки ниже: отправить, изменить или отменить.",
      env,
      broadcastConfirmKeyboard()
    );
    return;
  }

  if (session.step.startsWith("search_")) {
    await processSearchStep(chatId, text, session, env);
    return;
  }

  if (session.step.startsWith("pref_")) {
    await processPreferencesStep(chatId, text, session, env);
    return;
  }

  if (session.step.startsWith("edit_")) {
    await processEditStep(chatId, text, photoFileId, session, env);
    return;
  }

  await processProfileStep(chatId, text, username, photoFileId, session, env);
}

async function handleCallback(callback, env) {
  const chatId = callback.message.chat.id;
  const data = callback.data;

  await upsertUser(callback.from, env);
  await answerCallback(callback.id, env);

  if (data.startsWith("choice:")) {
    await handleChoiceCallback(callback, env);
    return;
  }

  if (data === "menu") {
    await clearSession(chatId, env);
    await sendMainMenu(chatId, env);
    return;
  }

  if (data === "more_menu") {
    await clearSession(chatId, env);
    await showMoreMenu(chatId, env);
    return;
  }

  if (data === "profile_section") {
    await clearSession(chatId, env);
    await showMyProfile(chatId, env);
    return;
  }

  if (data === "create_profile") {
    await clearSession(chatId, env);
    await startProfileCreation(chatId, env);
    return;
  }

  if (data === "my_profile") {
    await clearSession(chatId, env);
    await showMyProfile(chatId, env);
    return;
  }

  if (data.startsWith("match_actions:")) {
    const profileId = Number(data.split(":")[1]);
    await showMatchActions(chatId, profileId, env);
    return;
  }

  if (data.startsWith("match_request:")) {
    const profileId = Number(data.split(":")[1]);
    await createMatchRequest(chatId, profileId, env);
    return;
  }

  if (data.startsWith("match_accept:")) {
    const requestId = Number(data.split(":")[1]);
    await acceptMatchRequest(chatId, requestId, env);
    return;
  }

  if (data.startsWith("match_reject:")) {
    const requestId = Number(data.split(":")[1]);
    await rejectMatchRequest(chatId, requestId, env);
    return;
  }

  if (data.startsWith("contact_result:")) {
    const parts = data.split(":");
    const profileId = Number(parts[1]);
    const result = parts[2];
    await saveContactFeedbackResult(chatId, profileId, result, env);
    return;
  }

  if (data.startsWith("contact_relevance:")) {
    const parts = data.split(":");
    const profileId = Number(parts[1]);
    const relevance = parts[2];
    await saveContactFeedbackRelevance(chatId, profileId, relevance, env);
    return;
  }

  if (data.startsWith("hide_profile:")) {
    const profileId = Number(data.split(":")[1]);
    await hideProfileForUser(chatId, profileId, env);
    return;
  }

  if (data === "request_verification") {
    await requestProfileVerification(chatId, env);
    return;
  }

  if (data === "language_menu") {
    await showLanguageMenu(chatId, env);
    return;
  }

  if (data.startsWith("set_language:")) {
    const language = data.split(":")[1];
    await setUserLanguage(chatId, language, env);
    return;
  }

  if (data.startsWith("needs_changes:")) {
    if (!(await isAdmin(chatId, env))) return;
    const profileId = Number(data.split(":")[1]);
    await startModerationComment(chatId, profileId, env);
    return;
  }

  if (data === "find_profile") {
    await clearSession(chatId, env);
    await startSearchWithSavedPreferences(chatId, env);
    return;
  }

  if (data === "find_next") {
    await showNextProfile(chatId, env);
    return;
  }

  if (data === "preferences") {
    await clearSession(chatId, env);
    await showSearchPreferences(chatId, env);
    return;
  }

  if (data === "set_preferences") {
    await clearSession(chatId, env);
    await startPreferencesSetup(chatId, env);
    return;
  }

  if (data === "find_saved") {
    await clearSession(chatId, env);
    await startSearchWithSavedPreferences(chatId, env);
    return;
  }

  if (data === "find_no_filters") {
    await clearSession(chatId, env);
    await startSearchWithoutFilters(chatId, env);
    return;
  }

  if (data === "find_manual_filters") {
    await clearSession(chatId, env);
    await startSearchFilters(chatId, env);
    return;
  }

  if (data === "favorites") {
    await clearSession(chatId, env);
    await startFavorites(chatId, env);
    return;
  }

  if (data === "favorite_next") {
    await showNextFavorite(chatId, env);
    return;
  }

  if (data.startsWith("favorite_add:")) {
    const profileId = Number(data.split(":")[1]);
    await addFavorite(chatId, profileId, env);
    return;
  }

  if (data.startsWith("favorite_remove:")) {
    const profileId = Number(data.split(":")[1]);
    await removeFavorite(chatId, profileId, env);
    return;
  }

  if (data === "found_roommate") {
    await clearSession(chatId, env);
    await confirmFoundRoommate(chatId, env);
    return;
  }

  if (data === "found_confirm") {
    await clearSession(chatId, env);
    await markFoundRoommate(chatId, env);
    return;
  }

  if (data.startsWith("report_profile:")) {
    const profileId = Number(data.split(":")[1]);
    await showReportReasons(chatId, profileId, env);
    return;
  }

  if (data.startsWith("report_reason:")) {
    const parts = data.split(":");
    const profileId = Number(parts[1]);
    const reason = parts.slice(2).join(":");
    await saveReport(chatId, profileId, reason, env);
    return;
  }

  if (data === "edit_profile") {
    await clearSession(chatId, env);
    await showEditMenu(chatId, env);
    return;
  }

  if (data.startsWith("edit_field:")) {
    await clearSession(chatId, env);
    const field = data.split(":")[1];
    await startEditField(chatId, field, env);
    return;
  }

  if (data === "delete_profile") {
    await clearSession(chatId, env);
    await confirmDelete(chatId, env);
    return;
  }

  if (data === "delete_confirm") {
    await clearSession(chatId, env);
    await deleteProfile(chatId, env);
    return;
  }

  if (data === "share_bot") {
    await sendShareMessage(chatId, env);
    return;
  }

  if (data === "help") {
    await sendHelp(chatId, env);
    return;
  }

  if (data === "admin_panel") {
    if (!(await isAdmin(chatId, env))) return;
    await clearSession(chatId, env);
    await showAdminPanel(chatId, env);
    return;
  }

  if (data === "admin_reports") {
    if (!(await isAdmin(chatId, env))) return;
    await clearSession(chatId, env);
    await startAdminReports(chatId, env);
    return;
  }

  if (data === "admin_reports_next") {
    if (!(await isAdmin(chatId, env))) return;
    await showNextReport(chatId, env);
    return;
  }

  if (data === "admin_analytics") {
    if (!(await isAdmin(chatId, env))) return;
    await clearSession(chatId, env);
    await showAdvancedAnalytics(chatId, env);
    return;
  }

  if (data === "admin_broadcast") {
    if (!(await isAdmin(chatId, env))) return;
    await clearSession(chatId, env);
    await startBroadcastDraft(chatId, env);
    return;
  }

  if (data === "admin_verification_requests") {
    if (!(await isAdmin(chatId, env))) return;
    await clearSession(chatId, env);
    await startAdminVerificationRequests(chatId, env);
    return;
  }

  if (data === "admin_verification_next") {
    if (!(await isAdmin(chatId, env))) return;
    await showNextVerificationRequest(chatId, env);
    return;
  }

  if (data.startsWith("admin_approve_verification_request:")) {
    if (!(await isAdmin(chatId, env))) return;
    const requestId = Number(data.split(":")[1]);
    await approveVerificationRequest(chatId, requestId, env);
    return;
  }

  if (data.startsWith("admin_reject_verification_request:")) {
    if (!(await isAdmin(chatId, env))) return;
    const requestId = Number(data.split(":")[1]);
    await rejectVerificationRequest(chatId, requestId, env);
    return;
  }

  if (data === "admin_export_mvp_report") {
    if (!(await isAdmin(chatId, env))) return;
    await exportMvpReport(chatId, env);
    return;
  }

  if (data === "admin_broadcast_send") {
    if (!(await isAdmin(chatId, env))) return;
    await sendAdminBroadcast(chatId, env);
    return;
  }

  if (data === "admin_broadcast_edit") {
    if (!(await isAdmin(chatId, env))) return;
    await startBroadcastDraft(chatId, env);
    return;
  }

  if (data === "admin_broadcast_cancel") {
    if (!(await isAdmin(chatId, env))) return;
    await clearSession(chatId, env);
    await sendMessage(chatId, "Рассылка отменена ✅", env, adminPanelKeyboard());
    return;
  }

  if (data.startsWith("admin_close_report:")) {
    if (!(await isAdmin(chatId, env))) return;
    const reportId = Number(data.split(":")[1]);
    await closeReport(chatId, reportId, env);
    return;
  }

  if (data.startsWith("admin_hide_reported_profile:")) {
    if (!(await isAdmin(chatId, env))) return;
    const reportId = Number(data.split(":")[1]);
    await hideReportedProfile(chatId, reportId, env);
    return;
  }

  if (data.startsWith("admin_notify_owner:")) {
    if (!(await isAdmin(chatId, env))) return;
    const reportId = Number(data.split(":")[1]);
    await notifyReportedProfileOwner(chatId, reportId, env);
    return;
  }

  if (data.startsWith("admin_verify_profile:")) {
    if (!(await isAdmin(chatId, env))) return;
    const profileId = Number(data.split(":")[1]);
    await verifyProfile(profileId, chatId, env);
    return;
  }

  if (data.startsWith("admin_unverify_profile:")) {
    if (!(await isAdmin(chatId, env))) return;
    const profileId = Number(data.split(":")[1]);
    await unverifyProfile(profileId, chatId, env);
    return;
  }

  if (data === "admin_stats") {
    if (!(await isAdmin(chatId, env))) return;
    await showStats(chatId, env);
    return;
  }

  if (data === "admin_moderation") {
    if (!(await isAdmin(chatId, env))) return;
    await showPendingProfile(chatId, env);
    return;
  }

  if (data === "admin_export") {
    if (!(await isAdmin(chatId, env))) return;
    await exportProfilesCsv(chatId, env);
    return;
  }

  if (data.startsWith("approve_verify:")) {
    if (!(await isAdmin(chatId, env))) return;

    const profileId = Number(data.split(":")[1]);
    await approveProfile(profileId, chatId, env, true);
    return;
  }

  if (data.startsWith("approve:")) {
    if (!(await isAdmin(chatId, env))) return;

    const profileId = Number(data.split(":")[1]);
    await approveProfile(profileId, chatId, env, false);
    return;
  }

  if (data.startsWith("reject:")) {
    if (!(await isAdmin(chatId, env))) return;

    const profileId = Number(data.split(":")[1]);
    await rejectProfile(profileId, chatId, env);
    return;
  }
}

async function handleChoiceCallback(callback, env) {
  const chatId = callback.message.chat.id;
  const value = callback.data.slice("choice:".length);
  const session = await getSession(chatId, env);

  if (!session) {
    await sendMainMenu(chatId, env);
    return;
  }

  if (session.step.startsWith("search_")) {
    await processSearchStep(chatId, value, session, env);
    return;
  }

  if (session.step.startsWith("pref_")) {
    await processPreferencesStep(chatId, value, session, env);
    return;
  }

  if (session.step.startsWith("edit_")) {
    await processEditStep(chatId, value, null, session, env);
    return;
  }

  await processProfileStep(chatId, value, callback.from?.username || null, null, session, env);
}

async function sendMainMenu(chatId, env) {
  const isAdminUser = await isAdmin(chatId, env);
  const lang = await getUserLanguage(chatId, env);

  await sendMessage(
    chatId,
    lang === "en" ? "Quick action panel is pinned below 👇" : "Панель быстрых действий закреплена снизу 👇",
    env,
    persistentKeyboard(isAdminUser, lang)
  );

  const profile = await getActiveProfile(chatId, env);

  if (!profile) {
    await sendOnboarding(chatId, env, isAdminUser, lang);
    return;
  }

  const text = lang === "en"
    ? "Main menu 🏠\n\nChoose a section:"
    : "Главное меню 🏠\n\nВыбери основной раздел:";

  await sendMessage(chatId, text, env, await mainMenuKeyboard(chatId, env));
}

async function sendOnboarding(chatId, env, isAdminUser = false, lang = "ru") {
  const text = lang === "en"
    ? "Hi 👋\n\nI’ll help you find a roommate for shared rent.\n\nFirst, create your profile so other students can see you in search. It takes about 2–3 minutes. After moderation, your profile will appear in search."
    : "Привет 👋\n\nЯ помогу тебе найти соседа для совместной аренды жилья.\n\nЧтобы другие студенты могли увидеть тебя в поиске, сначала создай анкету. Это займёт примерно 2–3 минуты. После модерации анкета появится в поиске.";

  const keyboard = lang === "en"
    ? [
        [{ text: "📝 Create profile", callback_data: "create_profile" }],
        [{ text: "ℹ️ How it works", callback_data: "help" }],
        [{ text: "👥 Find roommate", callback_data: "find_profile" }],
        [{ text: "🌐 Language", callback_data: "language_menu" }]
      ]
    : [
        [{ text: "📝 Создать анкету", callback_data: "create_profile" }],
        [{ text: "ℹ️ Как это работает", callback_data: "help" }],
        [{ text: "👥 Найти соседа", callback_data: "find_profile" }],
        [{ text: "🌐 Язык / Language", callback_data: "language_menu" }]
      ];

  if (isAdminUser) {
    keyboard.push([{ text: lang === "en" ? "🛠 Admin panel" : "🛠 Админ-панель", callback_data: "admin_panel" }]);
  }

  await sendMessage(chatId, text, env, { inline_keyboard: keyboard });
}

async function getActiveProfile(chatId, env) {
  const profile = await env.x_roommate_db.prepare(
    "SELECT * FROM profiles WHERE telegram_id = ? AND is_active = 1"
  ).bind(chatId).first();

  return profile || null;
}

function persistentKeyboard(isAdminUser = false, lang = "ru") {
  const keyboard = lang === "en"
    ? [
        [{ text: "🏠 Menu" }, { text: "👥 Search" }],
        [{ text: "📋 Profile" }, { text: "⭐ Favorites" }],
        [{ text: "🌐 Language" }]
      ]
    : [
        [{ text: "🏠 Меню" }, { text: "👥 Поиск" }],
        [{ text: "📋 Анкета" }, { text: "⭐ Избранное" }],
        [{ text: "🌐 Язык" }]
      ];

  if (isAdminUser) {
    keyboard.push([{ text: lang === "en" ? "🛠 Admin" : "🛠 Админ" }]);
  }

  return {
    keyboard,
    resize_keyboard: true,
    is_persistent: true,
    one_time_keyboard: false
  };
}

function choiceKeyboard(options, includeMenu = true) {
  const buttons = options.map(option => {
    if (typeof option === "string") {
      return { text: option, callback_data: `choice:${option}` };
    }

    return { text: option.text, callback_data: `choice:${option.value}` };
  });

  const rows = [];

  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }

  if (includeMenu) {
    rows.push([{ text: "⬅️ В меню", callback_data: "menu" }]);
  }

  return { inline_keyboard: rows };
}

function universityChoiceOptions(includeSkip = false) {
  const options = [
    { text: "СПБУТУиЭ", value: "СПБУТУиЭ" },
    { text: "СПбГУ", value: "СПбГУ" },
    { text: "ИТМО", value: "ИТМО" },
    { text: "Политех", value: "Политех" },
    { text: "ВШЭ", value: "ВШЭ" },
    { text: "РАНХиГС", value: "РАНХиГС" }
  ];

  if (includeSkip) {
    options.push({ text: "Не важно", value: "-" });
  }

  return options;
}

function districtChoiceOptions(includeSkip = false) {
  const options = [
    { text: "Центр", value: "Центр" },
    { text: "Василеостровский", value: "Василеостровский" },
    { text: "Петроградский", value: "Петроградский" },
    { text: "Московский", value: "Московский" },
    { text: "Калининский", value: "Калининский" },
    { text: "Приморский", value: "Приморский" }
  ];

  if (includeSkip) {
    options.push({ text: "Не важно", value: "-" });
  }

  return options;
}

async function mainMenuKeyboard(chatId, env) {
  const lang = await getUserLanguage(chatId, env);
  const keyboard = lang === "en"
    ? [
        [{ text: "👥 Find roommate", callback_data: "find_profile" }],
        [{ text: "📋 My profile", callback_data: "my_profile" }],
        [{ text: "⚙️ Search preferences", callback_data: "preferences" }],
        [{ text: "⭐ Favorites", callback_data: "favorites" }],
        [{ text: "🌐 Language", callback_data: "language_menu" }],
        [{ text: "🧰 More", callback_data: "more_menu" }]
      ]
    : [
        [{ text: "👥 Найти соседа", callback_data: "find_profile" }],
        [{ text: "📋 Моя анкета", callback_data: "my_profile" }],
        [{ text: "⚙️ Предпочтения поиска", callback_data: "preferences" }],
        [{ text: "⭐ Избранное", callback_data: "favorites" }],
        [{ text: "🌐 Язык / Language", callback_data: "language_menu" }],
        [{ text: "🧰 Ещё", callback_data: "more_menu" }]
      ];

  if (await isAdmin(chatId, env)) {
    keyboard.push([{ text: lang === "en" ? "🛠 Admin panel" : "🛠 Админ-панель", callback_data: "admin_panel" }]);
  }

  return { inline_keyboard: keyboard };
}

async function showMoreMenu(chatId, env) {
  const lang = await getUserLanguage(chatId, env);
  const text = lang === "en"
    ? "🧰 More\n\nAdditional actions are here so the main menu stays clean."
    : "🧰 Ещё\n\nЗдесь собраны дополнительные действия, чтобы главное меню не было перегружено.";

  await sendMessage(chatId, text, env, moreMenuKeyboard(lang));
}

function moreMenuKeyboard(lang = "ru") {
  if (lang === "en") {
    return {
      inline_keyboard: [
        [{ text: "📝 Create new profile", callback_data: "create_profile" }],
        [{ text: "📤 Invite a friend", callback_data: "share_bot" }],
        [{ text: "🌐 Language", callback_data: "language_menu" }],
        [{ text: "ℹ️ Help", callback_data: "help" }],
        [{ text: "🗑 Delete profile", callback_data: "delete_profile" }],
        [{ text: "⬅️ Back to menu", callback_data: "menu" }]
      ]
    };
  }

  return {
    inline_keyboard: [
      [{ text: "📝 Создать новую анкету", callback_data: "create_profile" }],
      [{ text: "📤 Пригласить друга", callback_data: "share_bot" }],
      [{ text: "🌐 Язык / Language", callback_data: "language_menu" }],
      [{ text: "ℹ️ Помощь", callback_data: "help" }],
      [{ text: "🗑 Удалить анкету", callback_data: "delete_profile" }],
      [{ text: "⬅️ Назад в меню", callback_data: "menu" }]
    ]
  };
}

async function sendHelp(chatId, env) {
  const lang = await getUserLanguage(chatId, env);
  const text = lang === "en"
    ? "ℹ️ How the bot works:\n\n1. Create your profile: university, budget, district, lifestyle and other details.\n2. Your profile goes through moderation.\n3. Set your search preferences.\n4. The bot shows profiles with compatibility score and explanation.\n5. To contact someone, send a match request. Contacts open only if the other person accepts.\n\nYou can use buttons or type your own answers manually."
    : "ℹ️ Как работает бот:\n\n1. Создаёшь анкету: университет, бюджет, район, стиль жизни и другие детали.\n2. Анкета проходит модерацию.\n3. Настраиваешь предпочтения поиска.\n4. Бот показывает анкеты с процентом совместимости и объяснением, почему человек подходит.\n5. Чтобы связаться, отправляешь отклик. Контакты открываются только при взаимном интересе.\n\nПри заполнении анкеты можно нажимать кнопки или писать свой вариант вручную.";

  await sendMessage(chatId, text, env, await mainMenuKeyboard(chatId, env));
}

async function startProfileCreation(chatId, env) {
  await setSession(chatId, "name", {}, env);
  await sendMessage(chatId, "Начинаем создание анкеты ✅\n\nКак тебя зовут?", env);
}

async function processProfileStep(chatId, text, username, photoFileId, session, env) {
  const step = session.step;
  const data = session.data || {};

  if (step === "name") {
    data.name = text;
    await setSession(chatId, "age", data, env);
    await sendMessage(chatId, "Сколько тебе лет?", env);
    return;
  }

  if (step === "age") {
    const age = Number.parseInt(text, 10);

    if (!Number.isFinite(age) || age < 16 || age > 80) {
      await sendMessage(chatId, "Введи возраст числом, например: 19", env);
      return;
    }

    data.age = age;
    await setSession(chatId, "university", data, env);
    await sendMessage(
      chatId,
      "В каком университете ты учишься?\n\nМожно нажать кнопку или написать свой вариант вручную.",
      env,
      choiceKeyboard(universityChoiceOptions(false))
    );
    return;
  }

  if (step === "university") {
    data.university = text;
    await setSession(chatId, "budget", data, env);
    await sendMessage(chatId, "Какой у тебя бюджет в месяц?\n\nВведи числом, например: 25000", env);
    return;
  }

  if (step === "budget") {
    const budget = Number.parseInt(text.replace(/\s/g, ""), 10);

    if (!Number.isFinite(budget) || budget <= 0) {
      await sendMessage(chatId, "Введи бюджет числом, например: 25000", env);
      return;
    }

    data.budget = budget;
    await setSession(chatId, "district", data, env);
    await sendMessage(
      chatId,
      "Какой район тебе подходит?\n\nМожно нажать кнопку или написать свой вариант вручную.",
      env,
      choiceKeyboard(districtChoiceOptions(false))
    );
    return;
  }

  if (step === "district") {
    data.district = text;
    await setSession(chatId, "move_in_date", data, env);
    await sendMessage(chatId, "Когда планируешь заселяться?\n\nНапример: с августа / с 1 сентября", env);
    return;
  }

  if (step === "move_in_date") {
    data.move_in_date = text;
    await setSession(chatId, "housing_type", data, env);
    await sendMessage(
      chatId,
      "Какой тип жилья ищешь?\n\nМожно нажать кнопку или написать свой вариант вручную.",
      env,
      choiceKeyboard(["Комната", "Квартира", "Студия", { text: "Не важно", value: "Не важно" }])
    );
    return;
  }

  if (step === "housing_type") {
    data.housing_type = text;
    await setSession(chatId, "lifestyle", data, env);
    await sendMessage(
      chatId,
      "Какой у тебя стиль жизни?\n\nМожно нажать кнопку или написать свой вариант вручную.",
      env,
      choiceKeyboard(["Тихий", "Общительный", "Смешанный", "Активный"])
    );
    return;
  }

  if (step === "lifestyle") {
    data.lifestyle = text;
    await setSession(chatId, "smoking", data, env);
    await sendMessage(
      chatId,
      "Курение?\n\nМожно нажать кнопку или написать свой вариант вручную.",
      env,
      choiceKeyboard([
        { text: "🚭 Не курю", value: "Не курю" },
        { text: "🚬 Курю", value: "Курю" },
        { text: "🤷 Не важно", value: "Не важно" }
      ])
    );
    return;
  }

  if (step === "smoking") {
    data.smoking = text;
    await setSession(chatId, "pets", data, env);
    await sendMessage(
      chatId,
      "Животные?\n\nМожно нажать кнопку или написать свой вариант вручную.",
      env,
      choiceKeyboard([
        { text: "🚫 Нет", value: "Нет" },
        { text: "🐾 Есть", value: "Есть" },
        { text: "✅ Можно", value: "Можно" },
        { text: "🤷 Не важно", value: "Не важно" }
      ])
    );
    return;
  }

  if (step === "pets") {
    data.pets = text;
    await setSession(chatId, "about", data, env);
    await sendMessage(chatId, "Расскажи коротко о себе:\n\nпривычки, учёба, график, что важно в соседе", env);
    return;
  }

  if (step === "about") {
    data.about = text;
    await setSession(chatId, "photo", data, env);
    await sendMessage(
      chatId,
      "Добавь фото к анкете 🖼\n\nОтправь обычное фото профиля или нажми «Пропустить».",
      env,
      choiceKeyboard([{ text: "⏭ Пропустить", value: "-" }])
    );
    return;
  }

  if (step === "photo") {
    if (photoFileId) {
      data.photo_file_id = photoFileId;
    } else if (isSkip(text)) {
      data.photo_file_id = null;
    } else {
      await sendMessage(chatId, "Отправь фото или нажми «Пропустить».", env, choiceKeyboard([{ text: "⏭ Пропустить", value: "-" }]));
      return;
    }

    await saveProfile(chatId, username, data, env);
    await clearSession(chatId, env);

    let finalText =
      "Анкета сохранена ✅\n\n" +
      "Она отправлена на модерацию. После проверки она появится в поиске.";

    if (!username) {
      finalText +=
        "\n\n⚠️ Важно: у тебя не установлен Telegram username. " +
        "Другие пользователи не смогут написать тебе по кнопке. " +
        "Добавь username в настройках Telegram.";
    }

    await sendMessage(chatId, finalText, env, await mainMenuKeyboard(chatId, env));
    await notifyAdminsAboutProfile(chatId, env, "🆕 Новая анкета на модерации:");
  }
}

async function showSearchPreferences(chatId, env) {
  const preferences = await getSearchPreferences(chatId, env);

  if (!preferences) {
    await sendMessage(
      chatId,
      "⚙️ У тебя пока нет сохранённых предпочтений поиска.\n\n" +
        "Настрой их один раз — потом кнопка «👥 Найти соседа» будет сразу искать подходящие анкеты.",
      env,
      {
        inline_keyboard: [
          [{ text: "⚙️ Настроить предпочтения", callback_data: "set_preferences" }],
          [{ text: "🎛 Ввести разовые фильтры", callback_data: "find_manual_filters" }],
          [{ text: "🔄 Искать без фильтров", callback_data: "find_no_filters" }],
          [{ text: "⬅️ В меню", callback_data: "menu" }]
        ]
      }
    );
    return;
  }

  await sendMessage(
    chatId,
    formatPreferences(preferences),
    env,
    {
      inline_keyboard: [
        [{ text: "👥 Искать по этим предпочтениям", callback_data: "find_saved" }],
        [{ text: "✏️ Изменить предпочтения", callback_data: "set_preferences" }],
        [{ text: "🎛 Ввести разовые фильтры", callback_data: "find_manual_filters" }],
        [{ text: "🔄 Искать без фильтров", callback_data: "find_no_filters" }],
        [{ text: "⬅️ В меню", callback_data: "menu" }]
      ]
    }
  );
}

async function startPreferencesSetup(chatId, env) {
  await setSession(chatId, "pref_university", {}, env);

  await sendMessage(
    chatId,
    "Настроим предпочтения поиска ⚙️\n\n" +
      "Какой университет должен быть у соседа?\n" +
      "Если не важно — нажми кнопку или напиши: -",
    env,
    choiceKeyboard(universityChoiceOptions(true))
  );
}

async function processPreferencesStep(chatId, text, session, env) {
  const data = session.data || {};

  if (session.step === "pref_university") {
    data.preferred_university = normalizeFilter(text);
    await setSession(chatId, "pref_age", data, env);

    await sendMessage(
      chatId,
      "Какой возраст соседа тебе подходит?\n\n" +
        "Можно написать диапазон: 18-23\n" +
        "Или один возраст: 20\n" +
        "Если не важно — нажми кнопку или напиши: -",
      env,
      choiceKeyboard([{ text: "Не важно", value: "-" }])
    );
    return;
  }

  if (session.step === "pref_age") {
    const ageRange = parseAgeRange(text);

    if (isSkip(text)) {
      data.preferred_min_age = null;
      data.preferred_max_age = null;
    } else if (!ageRange) {
      await sendMessage(
        chatId,
        "Введи возраст так: 18-23, или нажми «Не важно».",
        env,
        choiceKeyboard([{ text: "Не важно", value: "-" }])
      );
      return;
    } else {
      data.preferred_min_age = ageRange.min;
      data.preferred_max_age = ageRange.max;
    }

    await setSession(chatId, "pref_budget", data, env);

    await sendMessage(
      chatId,
      "Какой максимальный бюджет у соседа?\n\nНапример: 25000\nЕсли не важно — нажми кнопку или напиши: -",
      env,
      choiceKeyboard([{ text: "Не важно", value: "-" }])
    );
    return;
  }

  if (session.step === "pref_budget") {
    if (isSkip(text)) {
      data.max_budget = null;
    } else {
      const budget = Number.parseInt(text.replace(/\s/g, ""), 10);

      if (!Number.isFinite(budget) || budget <= 0) {
        await sendMessage(chatId, "Введи бюджет числом, например: 25000, или нажми «Не важно».", env, choiceKeyboard([{ text: "Не важно", value: "-" }]));
        return;
      }

      data.max_budget = budget;
    }

    await setSession(chatId, "pref_district", data, env);

    await sendMessage(
      chatId,
      "Какой район тебе подходит?\n\nМожно нажать кнопку или написать свой вариант вручную. Если не важно — нажми «Не важно» или напиши: -",
      env,
      choiceKeyboard(districtChoiceOptions(true))
    );
    return;
  }

  if (session.step === "pref_district") {
    data.preferred_district = normalizeFilter(text);
    await setSession(chatId, "pref_housing_type", data, env);

    await sendMessage(
      chatId,
      "Какой тип жилья должен искать сосед?\n\nМожно нажать кнопку или написать свой вариант вручную.",
      env,
      choiceKeyboard(["Комната", "Квартира", "Студия", { text: "Не важно", value: "-" }])
    );
    return;
  }

  if (session.step === "pref_housing_type") {
    data.preferred_housing_type = normalizeFilter(text);
    await setSession(chatId, "pref_move_in_date", data, env);

    await sendMessage(
      chatId,
      "Когда сосед должен быть готов заселиться?\n\nНапример: август, сентябрь, с 1 сентября.\nЕсли не важно — нажми кнопку или напиши: -",
      env,
      choiceKeyboard([{ text: "Не важно", value: "-" }])
    );
    return;
  }

  if (session.step === "pref_move_in_date") {
    data.preferred_move_in_date = normalizeFilter(text);
    await setSession(chatId, "pref_lifestyle", data, env);

    await sendMessage(
      chatId,
      "Какой стиль жизни у соседа тебе подходит?\n\nМожно нажать кнопку или написать свой вариант вручную.",
      env,
      choiceKeyboard(["Тихий", "Общительный", "Смешанный", "Активный", { text: "Не важно", value: "-" }])
    );
    return;
  }

  if (session.step === "pref_lifestyle") {
    data.preferred_lifestyle = normalizeFilter(text);
    await setSession(chatId, "pref_smoking", data, env);

    await sendMessage(
      chatId,
      "Отношение к курению у соседа?\n\nМожно нажать кнопку или написать свой вариант вручную.",
      env,
      choiceKeyboard([
        { text: "🚭 Не курит", value: "Не курю" },
        { text: "🚬 Курит", value: "Курю" },
        { text: "🤷 Не важно", value: "-" }
      ])
    );
    return;
  }

  if (session.step === "pref_smoking") {
    data.smoking_preference = normalizeFilter(text);
    await setSession(chatId, "pref_pets", data, env);

    await sendMessage(
      chatId,
      "Отношение к животным у соседа?\n\nМожно нажать кнопку или написать свой вариант вручную.",
      env,
      choiceKeyboard([
        { text: "🚫 Без животных", value: "Нет" },
        { text: "🐾 Можно с животными", value: "Можно" },
        { text: "🤷 Не важно", value: "-" }
      ])
    );
    return;
  }

  if (session.step === "pref_pets") {
    data.pets_preference = normalizeFilter(text);

    await saveSearchPreferences(chatId, data, env);
    await clearSession(chatId, env);

    await sendMessage(
      chatId,
      "Предпочтения сохранены ✅\n\nТеперь кнопка «👥 Поиск» будет искать по ним.",
      env,
      {
        inline_keyboard: [
          [{ text: "👥 Найти соседа", callback_data: "find_saved" }],
          [{ text: "⚙️ Посмотреть предпочтения", callback_data: "preferences" }],
          [{ text: "⬅️ В меню", callback_data: "menu" }]
        ]
      }
    );
  }
}

async function startSearchWithSavedPreferences(chatId, env) {
  await logEvent(chatId, "search_started", "saved_preferences", env);
  const preferences = await getSearchPreferences(chatId, env);

  if (!preferences) {
    await showSearchPreferences(chatId, env);
    return;
  }

  const filters = preferencesToFilters(preferences);

  await setSession(chatId, "search_results", { ...filters, last_id: 0 }, env);
  await showNextProfile(chatId, env);
}

async function startSearchWithoutFilters(chatId, env) {
  await logEvent(chatId, "search_started", "no_filters", env);
  await setSession(chatId, "search_results", { last_id: 0 }, env);
  await showNextProfile(chatId, env);
}

async function startSearchFilters(chatId, env) {
  await logEvent(chatId, "search_started", "manual_filters", env);
  await setSession(chatId, "search_university", {}, env);

  await sendMessage(
    chatId,
    "Разовые фильтры поиска 👥\n\nВведи университет.\nМожно нажать кнопку или написать свой вариант вручную. Если не важно — нажми «Не важно» или напиши: -",
    env,
    choiceKeyboard(universityChoiceOptions(true))
  );
}

async function processSearchStep(chatId, text, session, env) {
  const data = session.data || {};

  if (session.step === "search_university") {
    data.university = normalizeFilter(text);
    await setSession(chatId, "search_age", data, env);

    await sendMessage(
      chatId,
      "Укажи возраст соседа.\nНапример: 18-23.\nЕсли не важно — нажми кнопку или напиши: -",
      env,
      choiceKeyboard([{ text: "Не важно", value: "-" }])
    );
    return;
  }

  if (session.step === "search_age") {
    const ageRange = parseAgeRange(text);

    if (isSkip(text)) {
      data.minAge = null;
      data.maxAge = null;
    } else if (!ageRange) {
      await sendMessage(chatId, "Введи возраст так: 18-23, или нажми «Не важно».", env, choiceKeyboard([{ text: "Не важно", value: "-" }]));
      return;
    } else {
      data.minAge = ageRange.min;
      data.maxAge = ageRange.max;
    }

    await setSession(chatId, "search_budget", data, env);

    await sendMessage(chatId, "Укажи максимальный бюджет.\nНапример: 25000\nЕсли не важно — нажми кнопку или напиши: -", env, choiceKeyboard([{ text: "Не важно", value: "-" }]));
    return;
  }

  if (session.step === "search_budget") {
    if (isSkip(text)) {
      data.maxBudget = null;
    } else {
      const budget = Number.parseInt(text.replace(/\s/g, ""), 10);

      if (!Number.isFinite(budget) || budget <= 0) {
        await sendMessage(chatId, "Введи бюджет числом, например: 25000, или нажми «Не важно».", env, choiceKeyboard([{ text: "Не важно", value: "-" }]));
        return;
      }

      data.maxBudget = budget;
    }

    await setSession(chatId, "search_district", data, env);

    await sendMessage(chatId, "Укажи район.\nМожно нажать кнопку или написать свой вариант вручную. Если не важно — нажми «Не важно» или напиши: -", env, choiceKeyboard(districtChoiceOptions(true)));
    return;
  }

  if (session.step === "search_district") {
    data.district = normalizeFilter(text);
    await setSession(chatId, "search_housing_type", data, env);

    await sendMessage(
      chatId,
      "Какой тип жилья нужен?\n\nМожно нажать кнопку или написать свой вариант вручную.",
      env,
      choiceKeyboard(["Комната", "Квартира", "Студия", { text: "Не важно", value: "-" }])
    );
    return;
  }

  if (session.step === "search_housing_type") {
    data.housingType = normalizeFilter(text);
    await setSession(chatId, "search_move_in_date", data, env);

    await sendMessage(
      chatId,
      "Когда нужно заселяться?\nНапример: август, сентябрь, с 1 сентября.\nЕсли не важно — нажми кнопку или напиши: -",
      env,
      choiceKeyboard([{ text: "Не важно", value: "-" }])
    );
    return;
  }

  if (session.step === "search_move_in_date") {
    data.moveInDate = normalizeFilter(text);
    data.last_id = 0;

    await setSession(chatId, "search_results", data, env);
    await showNextProfile(chatId, env);
  }
}

async function showNextProfile(chatId, env) {
  let session = await getSession(chatId, env);

  if (!session || session.step !== "search_results") {
    await startSearchWithSavedPreferences(chatId, env);
    return;
  }

  const filters = session.data || {};
  const lastId = filters.last_id || 0;

  let profile = await findProfileByFilters(chatId, filters, lastId, env);

  if (!profile) {
    profile = await findProfileByFilters(chatId, filters, 0, env);
  }

  if (!profile) {
    await sendMessage(
      chatId,
      "Подходящих одобренных анкет пока нет 😕\n\nПопробуй изменить предпочтения, расширить фильтры или искать без фильтров.",
      env,
      {
        inline_keyboard: [
          [{ text: "⚙️ Изменить предпочтения", callback_data: "set_preferences" }],
          [{ text: "🎛 Разовые фильтры", callback_data: "find_manual_filters" }],
          [{ text: "🔄 Искать без фильтров", callback_data: "find_no_filters" }],
          [{ text: "⬅️ В меню", callback_data: "menu" }]
        ]
      }
    );
    return;
  }

  filters.last_id = profile.id;
  await setSession(chatId, "search_results", filters, env);

  const compatibilityText = formatCompatibilityText(profile, filters);

  await sendProfile(chatId, profile, env, await profileKeyboard(chatId, profile, env), "", compatibilityText);
}

async function findProfileByFilters(chatId, filters, lastId, env) {
  const rows = await env.x_roommate_db.prepare(
    `SELECT * FROM profiles
     WHERE is_active = 1
       AND is_approved = 1
       AND COALESCE(found_roommate, 0) = 0
       AND telegram_id != ?
       AND id NOT IN (
         SELECT hidden_profile_id
         FROM hidden_profiles
         WHERE telegram_id = ?
       )
       AND id > ?
     ORDER BY id ASC
     LIMIT 500`
  ).bind(chatId, chatId, lastId || 0).all();

  const profiles = rows.results || [];
  const hasFilters = hasActiveFilters(filters);

  for (const profile of profiles) {
    const score = calculateCompatibility(profile, filters);

    if (!hasFilters) return profile;
    if (score >= 35) return profile;
  }

  return null;
}

async function profileKeyboard(chatId, profile, env) {
  const buttons = [];

  buttons.push([{ text: "🤝 Откликнуться", callback_data: `match_request:${profile.id}` }]);

  const isFavorite = await isProfileFavorite(chatId, profile.id, env);

  if (isFavorite) {
    buttons.push([{ text: "⭐ Уже в избранном", callback_data: `favorite_remove:${profile.id}` }]);
  } else {
    buttons.push([{ text: "⭐ В избранное", callback_data: `favorite_add:${profile.id}` }]);
  }

  buttons.push([{ text: "➡️ Следующая", callback_data: "find_next" }]);
  buttons.push([{ text: "🧰 Действия", callback_data: `match_actions:${profile.id}` }]);

  return { inline_keyboard: buttons };
}

async function showMatchActions(chatId, profileId, env) {
  const profile = await env.x_roommate_db.prepare(
    "SELECT id FROM profiles WHERE id = ? AND is_active = 1"
  ).bind(profileId).first();

  if (!profile) {
    await sendMessage(chatId, "Анкета не найдена или уже скрыта.", env, await mainMenuKeyboard(chatId, env));
    return;
  }

  await sendMessage(
    chatId,
    "🧰 Действия с анкетой:",
    env,
    {
      inline_keyboard: [
        [{ text: "🤝 Откликнуться", callback_data: `match_request:${profileId}` }],
        [{ text: "🚩 Пожаловаться", callback_data: `report_profile:${profileId}` }],
        [{ text: "🙈 Не показывать больше", callback_data: `hide_profile:${profileId}` }],
        [{ text: "⚙️ Изменить предпочтения", callback_data: "set_preferences" }],
        [{ text: "🔄 Искать без фильтров", callback_data: "find_no_filters" }],
        [{ text: "➡️ Следующая", callback_data: "find_next" }],
        [{ text: "⬅️ В меню", callback_data: "menu" }]
      ]
    }
  );
}

async function favoriteKeyboard(profile) {
  const buttons = [];

  buttons.push([{ text: "🤝 Откликнуться", callback_data: `match_request:${profile.id}` }]);

  buttons.push([{ text: "🗑 Убрать из избранного", callback_data: `favorite_remove:${profile.id}` }]);
  buttons.push([{ text: "🚩 Пожаловаться", callback_data: `report_profile:${profile.id}` }]);
  buttons.push([{ text: "➡️ Следующая избранная", callback_data: "favorite_next" }]);
  buttons.push([{ text: "⬅️ В меню", callback_data: "menu" }]);

  return { inline_keyboard: buttons };
}

async function startFavorites(chatId, env) {
  await setSession(chatId, "favorites_results", { last_id: 0 }, env);
  await showNextFavorite(chatId, env);
}

async function showNextFavorite(chatId, env) {
  let session = await getSession(chatId, env);

  if (!session || session.step !== "favorites_results") {
    session = { step: "favorites_results", data: { last_id: 0 } };
    await setSession(chatId, "favorites_results", session.data, env);
  }

  const lastId = session.data.last_id || 0;

  let profile = await getNextFavoriteProfile(chatId, lastId, env);

  if (!profile) {
    profile = await getNextFavoriteProfile(chatId, 0, env);
  }

  if (!profile) {
    await sendMessage(
      chatId,
      "В избранном пока нет анкет ⭐\n\nНажми «⭐ В избранное» под понравившейся анкетой.",
      env,
      {
        inline_keyboard: [
          [{ text: "👥 Найти соседа", callback_data: "find_profile" }],
          [{ text: "⬅️ В меню", callback_data: "menu" }]
        ]
      }
    );
    return;
  }

  await setSession(chatId, "favorites_results", { last_id: profile.id }, env);
  await sendProfile(chatId, profile, env, await favoriteKeyboard(profile), "", "⭐ Избранная анкета:");
}

async function getNextFavoriteProfile(chatId, lastId, env) {
  const row = await env.x_roommate_db.prepare(
    `SELECT p.*
     FROM favorites f
     JOIN profiles p ON p.id = f.favorite_profile_id
     WHERE f.telegram_id = ?
       AND p.is_active = 1
       AND p.id > ?
     ORDER BY p.id ASC
     LIMIT 1`
  ).bind(chatId, lastId || 0).first();

  return row || null;
}

async function addFavorite(chatId, profileId, env) {
  const profile = await env.x_roommate_db.prepare("SELECT id FROM profiles WHERE id = ? AND is_active = 1").bind(profileId).first();

  if (!profile) {
    await sendMessage(chatId, "Анкета не найдена или уже удалена.", env);
    return;
  }

  await env.x_roommate_db.prepare(
    `INSERT OR IGNORE INTO favorites (telegram_id, favorite_profile_id)
     VALUES (?, ?)`
  ).bind(chatId, profileId).run();

  await logEvent(chatId, "favorite_added", String(profileId), env);

  await sendMessage(
    chatId,
    "Анкета добавлена в избранное ⭐",
    env,
    {
      inline_keyboard: [
        [{ text: "⭐ Открыть избранное", callback_data: "favorites" }],
        [{ text: "➡️ Следующая анкета", callback_data: "find_next" }],
        [{ text: "⬅️ В меню", callback_data: "menu" }]
      ]
    }
  );
}

async function removeFavorite(chatId, profileId, env) {
  await env.x_roommate_db.prepare("DELETE FROM favorites WHERE telegram_id = ? AND favorite_profile_id = ?").bind(chatId, profileId).run();

  await sendMessage(
    chatId,
    "Анкета убрана из избранного 🗑",
    env,
    {
      inline_keyboard: [
        [{ text: "⭐ Открыть избранное", callback_data: "favorites" }],
        [{ text: "👥 Найти соседа", callback_data: "find_profile" }],
        [{ text: "⬅️ В меню", callback_data: "menu" }]
      ]
    }
  );
}

async function isProfileFavorite(chatId, profileId, env) {
  const row = await env.x_roommate_db.prepare("SELECT 1 AS ok FROM favorites WHERE telegram_id = ? AND favorite_profile_id = ?").bind(chatId, profileId).first();
  return !!row;
}

async function getSearchPreferences(chatId, env) {
  const preferences = await env.x_roommate_db.prepare("SELECT * FROM search_preferences WHERE telegram_id = ?").bind(chatId).first();
  return preferences || null;
}

async function saveSearchPreferences(chatId, data, env) {
  await env.x_roommate_db.prepare(
    `INSERT OR REPLACE INTO search_preferences
     (
       telegram_id,
       preferred_university,
       preferred_min_age,
       preferred_max_age,
       max_budget,
       preferred_district,
       preferred_housing_type,
       preferred_move_in_date,
       preferred_lifestyle,
       smoking_preference,
       pets_preference,
       updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(
    chatId,
    data.preferred_university || null,
    data.preferred_min_age || null,
    data.preferred_max_age || null,
    data.max_budget || null,
    data.preferred_district || null,
    data.preferred_housing_type || null,
    data.preferred_move_in_date || null,
    data.preferred_lifestyle || null,
    data.smoking_preference || null,
    data.pets_preference || null
  ).run();
}

function preferencesToFilters(preferences) {
  return {
    university: preferences.preferred_university || "",
    minAge: preferences.preferred_min_age || null,
    maxAge: preferences.preferred_max_age || null,
    maxBudget: preferences.max_budget || null,
    district: preferences.preferred_district || "",
    housingType: preferences.preferred_housing_type || "",
    moveInDate: preferences.preferred_move_in_date || "",
    lifestyle: preferences.preferred_lifestyle || "",
    smoking: preferences.smoking_preference || "",
    pets: preferences.pets_preference || ""
  };
}

function formatPreferences(preferences) {
  return (
    "⚙️ Твои предпочтения поиска:\n\n" +
    `🎓 Университет: ${formatPreferenceValue(preferences.preferred_university)}\n` +
    `🎂 Возраст: ${formatAgePreference(preferences.preferred_min_age, preferences.preferred_max_age)}\n` +
    `💰 Максимальный бюджет: ${preferences.max_budget ? `${preferences.max_budget} ₽/мес` : "не важно"}\n` +
    `📍 Район: ${formatPreferenceValue(preferences.preferred_district)}\n` +
    `🏠 Тип жилья: ${formatPreferenceValue(preferences.preferred_housing_type)}\n` +
    `📅 Заселение: ${formatPreferenceValue(preferences.preferred_move_in_date)}\n` +
    `🙂 Стиль жизни: ${formatPreferenceValue(preferences.preferred_lifestyle)}\n` +
    `🚬 Курение: ${formatPreferenceValue(preferences.smoking_preference)}\n` +
    `🐾 Животные: ${formatPreferenceValue(preferences.pets_preference)}`
  );
}

function formatAgePreference(minAge, maxAge) {
  if (!minAge && !maxAge) return "не важно";
  if (minAge && maxAge && minAge !== maxAge) return `${minAge}–${maxAge}`;
  return String(minAge || maxAge);
}

function formatPreferenceValue(value) {
  if (!value) return "не важно";
  return value;
}

async function showMyProfile(chatId, env) {
  const profile = await getActiveProfile(chatId, env);

  if (!profile) {
    await sendMessage(
      chatId,
      "У тебя пока нет активной анкеты.\n\nСоздай её, чтобы другие студенты могли найти тебя в поиске 👇",
      env,
      {
        inline_keyboard: [
          [{ text: "📝 Создать анкету", callback_data: "create_profile" }],
          [{ text: "⬅️ В меню", callback_data: "menu" }]
        ]
      }
    );
    return;
  }

  let status = "⏳ На модерации";

  if (profile.found_roommate === 1) {
    status = "✅ Сосед найден, анкета скрыта из поиска";
  } else if (profile.is_approved === 1) {
    status = "✅ Одобрена";
  }

  await sendProfile(
    chatId,
    profile,
    env,
    profileSectionKeyboard(profile),
    `\n\nСтатус анкеты: ${status}`,
    "📋 Моя анкета:"
  );
}

function profileSectionKeyboard(profile = {}) {
  const keyboard = [
    [{ text: "✏️ Редактировать", callback_data: "edit_profile" }]
  ];

  if (Number(profile.verified_profile) !== 1) {
    keyboard.push([{ text: "✅ Запросить проверку анкеты", callback_data: "request_verification" }]);
  }

  keyboard.push([{ text: "✅ Я нашёл соседа", callback_data: "found_roommate" }]);
  keyboard.push([{ text: "🗑 Удалить анкету", callback_data: "delete_profile" }]);
  keyboard.push([{ text: "⬅️ Назад в меню", callback_data: "menu" }]);

  return { inline_keyboard: keyboard };
}

async function showEditMenu(chatId, env) {
  const profile = await env.x_roommate_db.prepare("SELECT * FROM profiles WHERE telegram_id = ? AND is_active = 1").bind(chatId).first();

  if (!profile) {
    await sendMessage(chatId, "У тебя пока нет активной анкеты. Сначала создай её.", env, await mainMenuKeyboard(chatId, env));
    return;
  }

  await sendMessage(
    chatId,
    "Что хочешь изменить?",
    env,
    {
      inline_keyboard: [
        [{ text: "🎓 Университет", callback_data: "edit_field:university" }],
        [{ text: "💰 Бюджет", callback_data: "edit_field:budget" }],
        [{ text: "📍 Район", callback_data: "edit_field:district" }],
        [{ text: "📅 Дату заселения", callback_data: "edit_field:move_in_date" }],
        [{ text: "🏠 Тип жилья", callback_data: "edit_field:housing_type" }],
        [{ text: "🙂 Стиль жизни", callback_data: "edit_field:lifestyle" }],
        [{ text: "🚬 Курение", callback_data: "edit_field:smoking" }],
        [{ text: "🐾 Животные", callback_data: "edit_field:pets" }],
        [{ text: "📝 О себе", callback_data: "edit_field:about" }],
        [{ text: "🖼 Фото", callback_data: "edit_field:photo_file_id" }],
        [{ text: "⬅️ В меню", callback_data: "menu" }]
      ]
    }
  );
}

async function startEditField(chatId, field, env) {
  const fieldNames = {
    university: "университет",
    budget: "бюджет",
    district: "район",
    move_in_date: "дату заселения",
    housing_type: "тип жилья",
    lifestyle: "стиль жизни",
    smoking: "курение",
    pets: "животные",
    about: "описание о себе",
    photo_file_id: "фото анкеты"
  };

  if (!fieldNames[field]) {
    await sendMessage(chatId, "Неизвестное поле.", env);
    return;
  }

  await setSession(chatId, `edit_${field}`, { field }, env);

  if (field === "university") {
    await sendMessage(
      chatId,
      "Выбери университет или напиши свой вариант вручную.",
      env,
      choiceKeyboard(universityChoiceOptions(false))
    );
    return;
  }

  if (field === "district") {
    await sendMessage(
      chatId,
      "Выбери район или напиши свой вариант вручную.",
      env,
      choiceKeyboard(districtChoiceOptions(false))
    );
    return;
  }

  if (field === "housing_type") {
    await sendMessage(chatId, "Выбери новый тип жилья или напиши свой вариант вручную.", env, choiceKeyboard(["Комната", "Квартира", "Студия", { text: "Не важно", value: "Не важно" }]));
    return;
  }

  if (field === "lifestyle") {
    await sendMessage(chatId, "Выбери новый стиль жизни или напиши свой вариант вручную.", env, choiceKeyboard(["Тихий", "Общительный", "Смешанный", "Активный"]));
    return;
  }

  if (field === "smoking") {
    await sendMessage(chatId, "Выбери вариант по курению или напиши свой вариант вручную.", env, choiceKeyboard([{ text: "🚭 Не курю", value: "Не курю" }, { text: "🚬 Курю", value: "Курю" }, { text: "🤷 Не важно", value: "Не важно" }]));
    return;
  }

  if (field === "pets") {
    await sendMessage(chatId, "Выбери вариант по животным или напиши свой вариант вручную.", env, choiceKeyboard([{ text: "🚫 Нет", value: "Нет" }, { text: "🐾 Есть", value: "Есть" }, { text: "✅ Можно", value: "Можно" }, { text: "🤷 Не важно", value: "Не важно" }]));
    return;
  }

  if (field === "photo_file_id") {
    await sendMessage(chatId, "Отправь новое фото для анкеты 🖼\n\nЧтобы убрать фото, нажми «Убрать фото».", env, choiceKeyboard([{ text: "🗑 Убрать фото", value: "-" }]));
    return;
  }

  await sendMessage(chatId, `Введи новое значение для поля: ${fieldNames[field]}`, env);
}

async function processEditStep(chatId, text, photoFileId, session, env) {
  const field = session.data?.field;

  const allowedFields = {
    university: "university",
    budget: "budget",
    district: "district",
    move_in_date: "move_in_date",
    housing_type: "housing_type",
    lifestyle: "lifestyle",
    smoking: "smoking",
    pets: "pets",
    about: "about",
    photo_file_id: "photo_file_id"
  };

  const column = allowedFields[field];

  if (!column) {
    await clearSession(chatId, env);
    await sendMessage(chatId, "Ошибка редактирования. Попробуй снова.", env);
    return;
  }

  let value = text;

  if (field === "photo_file_id") {
    if (photoFileId) {
      value = photoFileId;
    } else if (isSkip(text)) {
      value = null;
    } else {
      await sendMessage(chatId, "Отправь фото или нажми «Убрать фото».", env, choiceKeyboard([{ text: "🗑 Убрать фото", value: "-" }]));
      return;
    }
  }

  if (field === "budget") {
    value = Number.parseInt(text.replace(/\s/g, ""), 10);

    if (!Number.isFinite(value) || value <= 0) {
      await sendMessage(chatId, "Введи бюджет числом, например: 25000", env);
      return;
    }
  }

  await env.x_roommate_db.prepare(
    `UPDATE profiles
     SET ${column} = ?,
         is_approved = 0,
         is_active = 1,
         verified_profile = 0,
         verified_at = NULL,
         moderation_status = 'pending',
         moderation_comment = NULL
     WHERE telegram_id = ?`
  ).bind(value, chatId).run();

  await clearSession(chatId, env);

  await sendMessage(chatId, "Анкета обновлена ✅\n\nПосле изменений она снова отправлена на модерацию.", env, await mainMenuKeyboard(chatId, env));
  await notifyAdminsAboutProfile(chatId, env, "✏️ Анкета обновлена и ждёт модерации:");
}

async function confirmFoundRoommate(chatId, env) {
  const profile = await env.x_roommate_db.prepare(
    "SELECT * FROM profiles WHERE telegram_id = ? AND is_active = 1"
  ).bind(chatId).first();

  if (!profile) {
    await sendMessage(
      chatId,
      "У тебя сейчас нет активной анкеты. Возможно, она уже скрыта или удалена.",
      env,
      await mainMenuKeyboard(chatId, env)
    );
    return;
  }

  await sendMessage(
    chatId,
    "Ты действительно нашёл соседа? ✅\n\nПосле подтверждения твоя анкета будет скрыта из поиска, а в статистике появится результат MVP.",
    env,
    {
      inline_keyboard: [
        [{ text: "✅ Да, я нашёл соседа", callback_data: "found_confirm" }],
        [{ text: "⬅️ Отмена", callback_data: "menu" }]
      ]
    }
  );
}

async function markFoundRoommate(chatId, env) {
  await env.x_roommate_db.prepare(
    `UPDATE profiles
     SET found_roommate = 1,
         found_at = CURRENT_TIMESTAMP,
         is_active = 0
     WHERE telegram_id = ?`
  ).bind(chatId).run();

  await logEvent(chatId, "found_roommate", null, env);

  await sendMessage(
    chatId,
    "Отлично, поздравляю 🎉\n\nТвоя анкета скрыта из поиска. Этот результат сохранён в статистике проекта.",
    env,
    await mainMenuKeyboard(chatId, env)
  );
}

async function showReportReasons(chatId, profileId, env) {
  const profile = await env.x_roommate_db.prepare(
    "SELECT id, name FROM profiles WHERE id = ? AND is_active = 1"
  ).bind(profileId).first();

  if (!profile) {
    await sendMessage(chatId, "Анкета не найдена или уже скрыта.", env);
    return;
  }

  await sendMessage(
    chatId,
    `Почему ты хочешь пожаловаться на анкету ${profile.name}?`,
    env,
    {
      inline_keyboard: [
        [{ text: "Фейковая анкета", callback_data: `report_reason:${profileId}:fake` }],
        [{ text: "Спам", callback_data: `report_reason:${profileId}:spam` }],
        [{ text: "Неприемлемый текст", callback_data: `report_reason:${profileId}:bad_text` }],
        [{ text: "Не отвечает", callback_data: `report_reason:${profileId}:no_reply` }],
        [{ text: "Другое", callback_data: `report_reason:${profileId}:other` }],
        [{ text: "⬅️ Отмена", callback_data: "menu" }]
      ]
    }
  );
}

async function saveReport(chatId, profileId, reason, env) {
  const profile = await env.x_roommate_db.prepare(
    "SELECT * FROM profiles WHERE id = ?"
  ).bind(profileId).first();

  if (!profile) {
    await sendMessage(chatId, "Анкета не найдена.", env);
    return;
  }

  await env.x_roommate_db.prepare(
    `INSERT INTO reports (reporter_telegram_id, reported_profile_id, reason, status)
     VALUES (?, ?, ?, 'new')`
  ).bind(chatId, profileId, reason || "other").run();

  await logEvent(chatId, "report_created", `${profileId}:${reason || "other"}`, env);

  await sendMessage(
    chatId,
    "Спасибо, жалоба отправлена администратору 🚩\n\nМы проверим анкету.",
    env,
    {
      inline_keyboard: [
        [{ text: "➡️ Следующая анкета", callback_data: "find_next" }],
        [{ text: "⬅️ В меню", callback_data: "menu" }]
      ]
    }
  );

  await notifyAdminsAboutReport(chatId, profile, reason, env);
}

async function notifyAdminsAboutReport(reporterChatId, profile, reason, env) {
  const admins = getAdminIds(env);
  if (!admins.length) return;

  const text =
    "🚩 Новая жалоба на анкету\n\n" +
    `Причина: ${formatReportReason(reason)}\n` +
    `От пользователя: ${reporterChatId}\n` +
    `ID анкеты: ${profile.id}\n` +
    `Имя: ${profile.name}\n` +
    `Telegram ID владельца: ${profile.telegram_id}`;

  for (const adminId of admins) {
    await sendMessage(
      adminId,
      text,
      env,
      {
        inline_keyboard: [
          [{ text: "🚩 Открыть жалобы", callback_data: "admin_reports" }],
          [{ text: "🙈 Скрыть анкету", callback_data: `reject:${profile.id}` }],
          [{ text: "🧰 Админ-панель", callback_data: "admin_panel" }]
        ]
      }
    );
  }
}

function formatReportReason(reason) {
  const reasons = {
    fake: "Фейковая анкета",
    spam: "Спам",
    bad_text: "Неприемлемый текст",
    no_reply: "Не отвечает",
    other: "Другое"
  };

  return reasons[reason] || "Другое";
}


async function showLanguageMenu(chatId, env) {
  const current = await getUserLanguage(chatId, env);
  const text =
    "🌐 Выбор языка / Choose language\n\n" +
    `Текущий язык / Current language: ${current === "en" ? "English" : "Русский"}`;

  await sendMessage(chatId, text, env, {
    inline_keyboard: [
      [{ text: "🇷🇺 Русский", callback_data: "set_language:ru" }],
      [{ text: "🇬🇧 English", callback_data: "set_language:en" }],
      [{ text: "⬅️ В меню / Back", callback_data: "menu" }]
    ]
  });
}

async function setUserLanguage(chatId, language, env) {
  const normalized = language === "en" ? "en" : "ru";

  await env.x_roommate_db.prepare(
    `INSERT INTO bot_users (telegram_id, language, created_at, last_seen_at, is_blocked)
     VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
     ON CONFLICT(telegram_id) DO UPDATE SET
       language = excluded.language,
       last_seen_at = CURRENT_TIMESTAMP`
  ).bind(chatId, normalized).run();

  await sendMessage(
    chatId,
    normalized === "en"
      ? "Language has been changed to English ✅\n\nSome admin sections may still be shown in Russian while we are testing the MVP."
      : "Язык изменён на русский ✅",
    env,
    await mainMenuKeyboard(chatId, env)
  );
}

async function getUserLanguage(chatId, env) {
  try {
    const row = await env.x_roommate_db.prepare(
      "SELECT language FROM bot_users WHERE telegram_id = ?"
    ).bind(chatId).first();

    return row?.language === "en" ? "en" : "ru";
  } catch (error) {
    return "ru";
  }
}

async function createMatchRequest(chatId, profileId, env) {
  const targetProfile = await env.x_roommate_db.prepare(
    "SELECT * FROM profiles WHERE id = ? AND is_active = 1 AND is_approved = 1"
  ).bind(profileId).first();

  if (!targetProfile) {
    await sendMessage(chatId, "Анкета не найдена или уже недоступна.", env, await mainMenuKeyboard(chatId, env));
    return;
  }

  if (Number(targetProfile.telegram_id) === Number(chatId)) {
    await sendMessage(chatId, "Нельзя откликнуться на собственную анкету.", env);
    return;
  }

  const requesterProfile = await getActiveProfile(chatId, env);

  if (!requesterProfile) {
    await sendMessage(
      chatId,
      "Сначала создай свою анкету. Так владелец другой анкеты сможет понять, кто хочет познакомиться.",
      env,
      {
        inline_keyboard: [
          [{ text: "📝 Создать анкету", callback_data: "create_profile" }],
          [{ text: "⬅️ В меню", callback_data: "menu" }]
        ]
      }
    );
    return;
  }

  const existing = await env.x_roommate_db.prepare(
    "SELECT * FROM match_requests WHERE requester_telegram_id = ? AND target_profile_id = ? ORDER BY id DESC LIMIT 1"
  ).bind(chatId, profileId).first();

  if (existing?.status === "pending") {
    await sendMessage(chatId, "Ты уже отправил отклик на эту анкету. Ждём ответа пользователя ⏳", env);
    return;
  }

  if (existing?.status === "accepted") {
    await sendMessage(chatId, "У вас уже есть взаимный матч ✅", env);
    return;
  }

  await env.x_roommate_db.prepare(
    `INSERT OR REPLACE INTO match_requests
     (requester_telegram_id, target_telegram_id, target_profile_id, status, created_at)
     VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)`
  ).bind(chatId, targetProfile.telegram_id, profileId).run();

  const request = await env.x_roommate_db.prepare(
    "SELECT * FROM match_requests WHERE requester_telegram_id = ? AND target_profile_id = ? ORDER BY id DESC LIMIT 1"
  ).bind(chatId, profileId).first();

  await logEvent(chatId, "match_request_sent", String(profileId), env);

  await sendMessage(
    chatId,
    "Отклик отправлен ✅\n\nЕсли пользователь тоже заинтересуется твоей анкетой, бот откроет вам контакты для переписки.",
    env,
    {
      inline_keyboard: [
        [{ text: "➡️ Следующая анкета", callback_data: "find_next" }],
        [{ text: "⬅️ В меню", callback_data: "menu" }]
      ]
    }
  );

  await sendProfile(
    targetProfile.telegram_id,
    requesterProfile,
    env,
    {
      inline_keyboard: [
        [{ text: "✅ Принять отклик", callback_data: `match_accept:${request.id}` }],
        [{ text: "❌ Отклонить", callback_data: `match_reject:${request.id}` }]
      ]
    },
    "\n\nПользователь хочет познакомиться с тобой как с потенциальным соседом. Если тебе тоже интересно, нажми «Принять отклик».",
    "🤝 Новый отклик на твою анкету:"
  );
}

async function acceptMatchRequest(ownerChatId, requestId, env) {
  const request = await env.x_roommate_db.prepare(
    `SELECT mr.*, 
            requester.name AS requester_name,
            requester.contact_username AS requester_username,
            target.name AS target_name,
            target.contact_username AS target_username
     FROM match_requests mr
     JOIN profiles requester ON requester.telegram_id = mr.requester_telegram_id AND requester.is_active = 1
     JOIN profiles target ON target.id = mr.target_profile_id
     WHERE mr.id = ?`
  ).bind(requestId).first();

  if (!request || Number(request.target_telegram_id) !== Number(ownerChatId)) {
    await sendMessage(ownerChatId, "Отклик не найден или уже недоступен.", env);
    return;
  }

  if (request.status === "accepted") {
    await sendMessage(ownerChatId, "Этот отклик уже принят ✅", env);
    return;
  }

  await env.x_roommate_db.prepare(
    "UPDATE match_requests SET status = 'accepted', responded_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(requestId).run();

  await logEvent(ownerChatId, "match_request_accepted", String(request.target_profile_id), env);
  await logEvent(request.requester_telegram_id, "match_request_was_accepted", String(request.target_profile_id), env);

  const ownerContact = request.target_username ? `@${request.target_username}` : "у владельца анкеты не указан username";
  const requesterContact = request.requester_username ? `@${request.requester_username}` : "у откликнувшегося пользователя не указан username";

  await sendMessage(
    ownerChatId,
    `🎉 Взаимный матч!\n\nТы принял отклик пользователя ${request.requester_name}.\nКонтакт для связи: ${requesterContact}`,
    env,
    await mainMenuKeyboard(ownerChatId, env)
  );

  await sendMessage(
    request.requester_telegram_id,
    `🎉 Взаимный матч!\n\nПользователь ${request.target_name} принял твой отклик.\nКонтакт для связи: ${ownerContact}`,
    env,
    await mainMenuKeyboard(request.requester_telegram_id, env)
  );
}

async function rejectMatchRequest(ownerChatId, requestId, env) {
  const request = await env.x_roommate_db.prepare(
    "SELECT * FROM match_requests WHERE id = ?"
  ).bind(requestId).first();

  if (!request || Number(request.target_telegram_id) !== Number(ownerChatId)) {
    await sendMessage(ownerChatId, "Отклик не найден или уже недоступен.", env);
    return;
  }

  await env.x_roommate_db.prepare(
    "UPDATE match_requests SET status = 'rejected', responded_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(requestId).run();

  await logEvent(ownerChatId, "match_request_rejected", String(request.target_profile_id), env);

  await sendMessage(ownerChatId, "Отклик отклонён. Контакты не будут открыты.", env, await mainMenuKeyboard(ownerChatId, env));
  await sendMessage(request.requester_telegram_id, "Твой отклик отклонён. Ничего страшного — продолжай поиск подходящего соседа 👥", env);
}

async function startModerationComment(adminChatId, profileId, env) {
  const profile = await env.x_roommate_db.prepare(
    "SELECT * FROM profiles WHERE id = ?"
  ).bind(profileId).first();

  if (!profile) {
    await sendMessage(adminChatId, "Анкета не найдена.", env, adminPanelKeyboard());
    return;
  }

  await setSession(adminChatId, "admin_moderation_comment", { profileId }, env);
  await sendMessage(
    adminChatId,
    `Напиши комментарий для пользователя ${profile.name}.\n\nНапример: «Добавь фото и подробнее опиши график жизни».\n\nЧтобы отменить — /cancel`,
    env
  );
}

async function saveModerationComment(adminChatId, comment, session, env) {
  const profileId = session.data?.profileId;
  const cleanComment = comment.trim();

  if (!profileId || !cleanComment) {
    await sendMessage(adminChatId, "Комментарий не должен быть пустым.", env);
    return;
  }

  const profile = await env.x_roommate_db.prepare(
    "SELECT * FROM profiles WHERE id = ?"
  ).bind(profileId).first();

  if (!profile) {
    await clearSession(adminChatId, env);
    await sendMessage(adminChatId, "Анкета не найдена.", env, adminPanelKeyboard());
    return;
  }

  await env.x_roommate_db.prepare(
    `UPDATE profiles
     SET is_approved = 0,
         moderation_status = 'needs_changes',
         moderation_comment = ?
     WHERE id = ?`
  ).bind(cleanComment, profileId).run();

  await clearSession(adminChatId, env);
  await logEvent(profile.telegram_id, "profile_needs_changes", JSON.stringify({ by_admin: adminChatId }), env);

  await sendMessage(
    adminChatId,
    "Комментарий отправлен пользователю ✅",
    env,
    adminPanelKeyboard()
  );

  await sendMessage(
    profile.telegram_id,
    `Твоя анкета пока не прошла модерацию.\n\nКомментарий администратора:\n${cleanComment}\n\nИсправь анкету и отправь её на проверку ещё раз.`,
    env,
    {
      inline_keyboard: [
        [{ text: "✏️ Редактировать анкету", callback_data: "edit_profile" }],
        [{ text: "📋 Моя анкета", callback_data: "my_profile" }]
      ]
    }
  );
}

async function openContactProfile(chatId, profileId, env) {
  const profile = await env.x_roommate_db.prepare(
    "SELECT * FROM profiles WHERE id = ? AND is_active = 1"
  ).bind(profileId).first();

  if (!profile) {
    await sendMessage(chatId, "Анкета не найдена или уже скрыта.", env, await mainMenuKeyboard(chatId, env));
    return;
  }

  if (!profile.contact_username) {
    await sendMessage(chatId, "У этой анкеты пока нет Telegram username для связи.", env, {
      inline_keyboard: [
        [{ text: "🤝 Откликнуться", callback_data: `match_request:${profileId}` }],
        [{ text: "🚩 Пожаловаться", callback_data: `report_profile:${profileId}` }],
        [{ text: "➡️ Следующая анкета", callback_data: "find_next" }],
        [{ text: "⬅️ В меню", callback_data: "menu" }]
      ]
    });
    return;
  }

  await env.x_roommate_db.prepare(
    `INSERT INTO contact_feedback (telegram_id, contacted_profile_id)
     VALUES (?, ?)`
  ).bind(chatId, profileId).run();

  await logEvent(chatId, "contact_clicked", String(profileId), env);

  await sendMessage(
    chatId,
    `Открой контакт и напиши пользователю 👇

После этого отметь, удалось ли связаться — это поможет улучшить подбор.`,
    env,
    {
      inline_keyboard: [
        [{ text: "💬 Открыть Telegram", url: `https://t.me/${profile.contact_username}` }],
        [
          { text: "👍 Удалось связаться", callback_data: `contact_result:${profileId}:success` },
          { text: "👎 Не удалось", callback_data: `contact_result:${profileId}:failed` }
        ],
        [{ text: "⬅️ В меню", callback_data: "menu" }]
      ]
    }
  );
}

async function saveContactFeedbackResult(chatId, profileId, result, env) {
  const status = result === "success" ? "success" : "failed";

  await env.x_roommate_db.prepare(
    `UPDATE contact_feedback
     SET contact_status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = (
       SELECT id FROM contact_feedback
       WHERE telegram_id = ? AND contacted_profile_id = ?
       ORDER BY id DESC
       LIMIT 1
     )`
  ).bind(status, chatId, profileId).run();

  await logEvent(chatId, `contact_${status}`, String(profileId), env);

  if (status === "failed") {
    await sendMessage(
      chatId,
      "Спасибо, отметили 👌\n\nМожешь пожаловаться на анкету или перейти к следующей.",
      env,
      {
        inline_keyboard: [
          [{ text: "🚩 Пожаловаться", callback_data: `report_profile:${profileId}` }],
          [{ text: "➡️ Следующая анкета", callback_data: "find_next" }],
          [{ text: "⬅️ В меню", callback_data: "menu" }]
        ]
      }
    );
    return;
  }

  await sendMessage(
    chatId,
    "Отлично 👍\n\nАнкета была релевантной твоим ожиданиям?",
    env,
    {
      inline_keyboard: [
        [
          { text: "✅ Да, релевантная", callback_data: `contact_relevance:${profileId}:relevant` },
          { text: "❌ Нет", callback_data: `contact_relevance:${profileId}:not_relevant` }
        ],
        [{ text: "➡️ Следующая анкета", callback_data: "find_next" }],
        [{ text: "⬅️ В меню", callback_data: "menu" }]
      ]
    }
  );
}

async function saveContactFeedbackRelevance(chatId, profileId, relevance, env) {
  const value = relevance === "relevant" ? "relevant" : "not_relevant";

  await env.x_roommate_db.prepare(
    `UPDATE contact_feedback
     SET relevance = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = (
       SELECT id FROM contact_feedback
       WHERE telegram_id = ? AND contacted_profile_id = ?
       ORDER BY id DESC
       LIMIT 1
     )`
  ).bind(value, chatId, profileId).run();

  await logEvent(chatId, `contact_${value}`, String(profileId), env);

  await sendMessage(
    chatId,
    "Спасибо за обратную связь ✅\n\nЭти данные помогут улучшить качество matching.",
    env,
    {
      inline_keyboard: [
        [{ text: "➡️ Следующая анкета", callback_data: "find_next" }],
        [{ text: "⭐ Избранное", callback_data: "favorites" }],
        [{ text: "⬅️ В меню", callback_data: "menu" }]
      ]
    }
  );
}

async function hideProfileForUser(chatId, profileId, env) {
  const profile = await env.x_roommate_db.prepare(
    "SELECT id FROM profiles WHERE id = ? AND is_active = 1"
  ).bind(profileId).first();

  if (!profile) {
    await sendMessage(chatId, "Анкета не найдена или уже скрыта.", env, await mainMenuKeyboard(chatId, env));
    return;
  }

  await env.x_roommate_db.prepare(
    `INSERT OR IGNORE INTO hidden_profiles (telegram_id, hidden_profile_id, reason)
     VALUES (?, ?, 'user_hidden')`
  ).bind(chatId, profileId).run();

  await logEvent(chatId, "profile_hidden", String(profileId), env);

  await sendMessage(
    chatId,
    "Анкета скрыта 🙈\n\nБольше не будем показывать её тебе в поиске.",
    env,
    {
      inline_keyboard: [
        [{ text: "➡️ Следующая анкета", callback_data: "find_next" }],
        [{ text: "⬅️ В меню", callback_data: "menu" }]
      ]
    }
  );
}

async function requestProfileVerification(chatId, env) {
  const profile = await getActiveProfile(chatId, env);

  if (!profile) {
    await sendMessage(chatId, "Сначала создай анкету, потом можно будет запросить проверку.", env, {
      inline_keyboard: [
        [{ text: "📝 Создать анкету", callback_data: "create_profile" }],
        [{ text: "⬅️ В меню", callback_data: "menu" }]
      ]
    });
    return;
  }

  if (Number(profile.verified_profile) === 1) {
    await sendMessage(chatId, "Твоя анкета уже проверена ✅", env, await mainMenuKeyboard(chatId, env));
    return;
  }

  const pending = await env.x_roommate_db.prepare(
    "SELECT id FROM verification_requests WHERE telegram_id = ? AND profile_id = ? AND status = 'pending'"
  ).bind(chatId, profile.id).first();

  if (pending) {
    await sendMessage(chatId, "Заявка на проверку уже отправлена и ждёт рассмотрения ⏳", env, await mainMenuKeyboard(chatId, env));
    return;
  }

  const result = await env.x_roommate_db.prepare(
    `INSERT INTO verification_requests (telegram_id, profile_id, status)
     VALUES (?, ?, 'pending')`
  ).bind(chatId, profile.id).run();

  await logEvent(chatId, "verification_requested", String(profile.id), env);
  await notifyAdminsAboutVerificationRequest(profile, result.meta?.last_row_id || null, env);

  await sendMessage(
    chatId,
    "Заявка на проверку отправлена ✅\n\nАдминистратор рассмотрит анкету и сможет поставить статус «Проверенная анкета».",
    env,
    await mainMenuKeyboard(chatId, env)
  );
}

async function notifyAdminsAboutVerificationRequest(profile, requestId, env) {
  const admins = getAdminIds(env);
  if (!admins.length) return;

  for (const adminId of admins) {
    const keyboard = requestId
      ? {
          inline_keyboard: [
            [{ text: "✅ Подтвердить", callback_data: `admin_approve_verification_request:${requestId}` }],
            [{ text: "❌ Отклонить", callback_data: `admin_reject_verification_request:${requestId}` }],
            [{ text: "🛠 Админ-панель", callback_data: "admin_panel" }]
          ]
        }
      : adminPanelKeyboard();

    await sendProfile(adminId, profile, env, keyboard, "", "✅ Новая заявка на проверку анкеты:");
  }
}


async function showAdminPanel(chatId, env) {
  if (!(await isAdmin(chatId, env))) {
    await sendMessage(chatId, "Этот раздел доступен только администратору.", env);
    return;
  }

  const pending = await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE is_active = 1 AND is_approved = 0");
  const newReports = await countRows(env, "SELECT COUNT(*) AS count FROM reports WHERE status = 'new'");
  const verificationRequests = await countRows(env, "SELECT COUNT(*) AS count FROM verification_requests WHERE status = 'pending'");
  const found = await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE found_roommate = 1");
  const verified = await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE is_active = 1 AND verified_profile = 1");
  const activeToday = await countRows(env, "SELECT COUNT(*) AS count FROM bot_users WHERE last_seen_at >= datetime('now', 'start of day')");
  const searchesToday = await countRows(env, "SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'search_started' AND created_at >= datetime('now', 'start of day')");

  const text = `🧰 Админ-панель

Анкет на модерации: ${pending}
Новых жалоб: ${newReports}
Заявок на проверку: ${verificationRequests}
Проверенных анкет: ${verified}
Нашли соседа: ${found}
Активных сегодня: ${activeToday}
Поисков сегодня: ${searchesToday}

Выбери действие:`;

  await sendMessage(chatId, text, env, adminPanelKeyboard());
}

function adminPanelKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🚩 Жалобы на анкеты", callback_data: "admin_reports" }],
      [{ text: "✅ Заявки на проверку", callback_data: "admin_verification_requests" }],
      [{ text: "🛡 Новые анкеты на модерации", callback_data: "admin_moderation" }],
      [{ text: "📈 Расширенная аналитика", callback_data: "admin_analytics" }],
      [{ text: "📣 Рассылка", callback_data: "admin_broadcast" }],
      [{ text: "📊 Краткая статистика", callback_data: "admin_stats" }],
      [{ text: "📥 Экспорт CSV", callback_data: "admin_export" }],
      [{ text: "📊 Скачать отчёт MVP", callback_data: "admin_export_mvp_report" }],
      [{ text: "⬅️ В обычное меню", callback_data: "menu" }]
    ]
  };
}


async function showAdvancedAnalytics(chatId, env) {
  if (!(await isAdmin(chatId, env))) {
    await sendMessage(chatId, "Этот раздел доступен только администратору.", env);
    return;
  }

  const usersTotal = await countRows(env, "SELECT COUNT(*) AS count FROM bot_users");
  const usersToday = await countRows(env, "SELECT COUNT(*) AS count FROM bot_users WHERE created_at >= datetime('now', 'start of day')");
  const usersWeek = await countRows(env, "SELECT COUNT(*) AS count FROM bot_users WHERE created_at >= datetime('now', '-7 days')");
  const activeToday = await countRows(env, "SELECT COUNT(*) AS count FROM bot_users WHERE last_seen_at >= datetime('now', 'start of day')");
  const activeWeek = await countRows(env, "SELECT COUNT(*) AS count FROM bot_users WHERE last_seen_at >= datetime('now', '-7 days')");

  const profilesTotal = await countRows(env, "SELECT COUNT(*) AS count FROM profiles");
  const profilesToday = await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE created_at >= datetime('now', 'start of day')");
  const profilesWeek = await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE created_at >= datetime('now', '-7 days')");
  const profilesApproved = await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE is_active = 1 AND is_approved = 1");
  const profilesVerified = await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE is_active = 1 AND verified_profile = 1");
  const profilesPending = await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE is_active = 1 AND is_approved = 0");
  const foundTotal = await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE found_roommate = 1");
  const foundWeek = await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE found_roommate = 1 AND found_at >= datetime('now', '-7 days')");

  const searchesToday = await countRows(env, "SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'search_started' AND created_at >= datetime('now', 'start of day')");
  const searchesWeek = await countRows(env, "SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'search_started' AND created_at >= datetime('now', '-7 days')");
  const profilesSavedWeek = await countRows(env, "SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'profile_saved' AND created_at >= datetime('now', '-7 days')");
  const favoritesTotal = await countRows(env, "SELECT COUNT(*) AS count FROM favorites");
  const favoritesWeek = await countRows(env, "SELECT COUNT(*) AS count FROM favorites WHERE created_at >= datetime('now', '-7 days')");

  const reportsTotal = await countRows(env, "SELECT COUNT(*) AS count FROM reports");
  const reportsNew = await countRows(env, "SELECT COUNT(*) AS count FROM reports WHERE status = 'new'");
  const reportsWeek = await countRows(env, "SELECT COUNT(*) AS count FROM reports WHERE created_at >= datetime('now', '-7 days')");

  const broadcastsTotal = await countRows(env, "SELECT COUNT(*) AS count FROM broadcast_logs");
  const broadcastsSentTotal = await countRows(env, "SELECT COALESCE(SUM(sent_count), 0) AS count FROM broadcast_logs");
  const recipientsCount = await getBroadcastRecipientCount(env);

  const contactClicks = await countRows(env, "SELECT COUNT(*) AS count FROM contact_feedback");
  const successfulContacts = await countRows(env, "SELECT COUNT(*) AS count FROM contact_feedback WHERE contact_status = 'success'");
  const relevantContacts = await countRows(env, "SELECT COUNT(*) AS count FROM contact_feedback WHERE relevance = 'relevant'");
  const hiddenProfiles = await countRows(env, "SELECT COUNT(*) AS count FROM hidden_profiles");
  const verificationRequestsPending = await countRows(env, "SELECT COUNT(*) AS count FROM verification_requests WHERE status = 'pending'");
  const verificationRequestsApproved = await countRows(env, "SELECT COUNT(*) AS count FROM verification_requests WHERE status = 'approved'");

  const text =
    "📈 Расширенная аналитика\n\n" +
    "👥 Пользователи\n" +
    `Всего пользователей: ${usersTotal}\n` +
    `Новых сегодня: ${usersToday}\n` +
    `Новых за 7 дней: ${usersWeek}\n` +
    `Активных сегодня: ${activeToday}\n` +
    `Активных за 7 дней: ${activeWeek}\n\n` +
    "📋 Анкеты\n" +
    `Всего анкет: ${profilesTotal}\n` +
    `Новых сегодня: ${profilesToday}\n` +
    `Новых за 7 дней: ${profilesWeek}\n` +
    `Одобренных активных: ${profilesApproved}\n` +
    `На модерации: ${profilesPending}\n` +
    `Нашли соседа всего: ${foundTotal}\n` +
    `Нашли соседа за 7 дней: ${foundWeek}\n\n` +
    "🔎 Активность\n" +
    `Поисков сегодня: ${searchesToday}\n` +
    `Поисков за 7 дней: ${searchesWeek}\n` +
    `Создано/обновлено анкет за 7 дней: ${profilesSavedWeek}\n` +
    `Избранных всего: ${favoritesTotal}\n` +
    `Добавлений в избранное за 7 дней: ${favoritesWeek}\n\n` +
    "💬 Контакты\n" +
    `Нажатий «Написать»: ${contactClicks}\n` +
    `Успешных контактов: ${successfulContacts}\n` +
    `Релевантных контактов: ${relevantContacts}\n\n` +
    "🚩 Безопасность\n" +
    `Жалоб всего: ${reportsTotal}\n` +
    `Новых жалоб: ${reportsNew}\n` +
    `Жалоб за 7 дней: ${reportsWeek}\n` +
    `Скрытий анкет пользователями: ${hiddenProfiles}\n` +
    `Заявок на проверку: ${verificationRequestsPending}\n` +
    `Одобренных заявок на проверку: ${verificationRequestsApproved}\n\n` +
    "📣 Рассылки\n" +
    `Доступных получателей: ${recipientsCount}\n` +
    `Рассылок отправлено: ${broadcastsTotal}\n` +
    `Сообщений доставлено суммарно: ${broadcastsSentTotal}`;

  await sendMessage(chatId, text, env, adminPanelKeyboard());
}

async function startBroadcastDraft(chatId, env) {
  if (!(await isAdmin(chatId, env))) {
    await sendMessage(chatId, "Этот раздел доступен только администратору.", env);
    return;
  }

  const recipientsCount = await getBroadcastRecipientCount(env);

  await setSession(chatId, "admin_broadcast_text", {}, env);

  await sendMessage(
    chatId,
    `📣 Рассылка\n\nПолучателей сейчас: ${recipientsCount}\n\nОтправь текст сообщения, который нужно разослать пользователям.\n\nЧтобы отменить — нажми кнопку ниже или напиши /cancel.`,
    env,
    {
      inline_keyboard: [
        [{ text: "⬅️ Отмена", callback_data: "admin_broadcast_cancel" }]
      ]
    }
  );
}

async function processBroadcastText(chatId, text, env) {
  if (!text || text.length < 2) {
    await sendMessage(chatId, "Сообщение слишком короткое. Отправь текст рассылки или напиши /cancel.", env);
    return;
  }

  if (text.length > 3500) {
    await sendMessage(chatId, "Сообщение слишком длинное. Сделай текст короче 3500 символов.", env);
    return;
  }

  const recipientsCount = await getBroadcastRecipientCount(env);

  await setSession(chatId, "admin_broadcast_confirm", { text }, env);

  const preview =
    "📣 Предпросмотр рассылки\n\n" +
    `Получателей: ${recipientsCount}\n\n` +
    "Текст:\n" +
    text;

  await sendMessage(chatId, preview, env, broadcastConfirmKeyboard());
}

function broadcastConfirmKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "✅ Отправить рассылку", callback_data: "admin_broadcast_send" }],
      [{ text: "✏️ Изменить текст", callback_data: "admin_broadcast_edit" }],
      [{ text: "⬅️ Отмена", callback_data: "admin_broadcast_cancel" }]
    ]
  };
}

async function sendAdminBroadcast(chatId, env) {
  const session = await getSession(chatId, env);
  const text = session?.data?.text;

  if (!session || session.step !== "admin_broadcast_confirm" || !text) {
    await sendMessage(chatId, "Текст рассылки не найден. Создай рассылку заново.", env, adminPanelKeyboard());
    return;
  }

  const recipients = await getBroadcastRecipients(env);

  if (!recipients.length) {
    await clearSession(chatId, env);
    await sendMessage(chatId, "Нет получателей для рассылки.", env, adminPanelKeyboard());
    return;
  }

  await sendMessage(chatId, `Начинаю рассылку на ${recipients.length} пользователей…`, env);

  let sent = 0;
  let failed = 0;

  for (const recipientId of recipients) {
    const result = await sendBroadcastMessage(recipientId, text, env);

    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;

      if (result.status === 403) {
        await markUserBlocked(recipientId, env);
      }
    }
  }

  await env.x_roommate_db.prepare(
    `INSERT INTO broadcast_logs (admin_telegram_id, message_text, sent_count, failed_count)
     VALUES (?, ?, ?, ?)`
  ).bind(chatId, text, sent, failed).run();

  await logEvent(chatId, "broadcast_sent", JSON.stringify({ sent, failed }), env);
  await clearSession(chatId, env);

  await sendMessage(
    chatId,
    `Рассылка завершена ✅\n\nОтправлено: ${sent}\nОшибок: ${failed}`,
    env,
    adminPanelKeyboard()
  );
}

async function getBroadcastRecipients(env) {
  const rows = await env.x_roommate_db.prepare(
    `SELECT DISTINCT telegram_id
     FROM (
       SELECT telegram_id FROM bot_users WHERE is_blocked = 0
       UNION
       SELECT telegram_id FROM profiles
       UNION
       SELECT telegram_id FROM search_preferences
       UNION
       SELECT telegram_id FROM favorites
     )
     WHERE telegram_id IS NOT NULL
     LIMIT 1000`
  ).all();

  return (rows.results || [])
    .map(row => Number(row.telegram_id))
    .filter(id => Number.isFinite(id));
}

async function getBroadcastRecipientCount(env) {
  const row = await env.x_roommate_db.prepare(
    `SELECT COUNT(DISTINCT telegram_id) AS count
     FROM (
       SELECT telegram_id FROM bot_users WHERE is_blocked = 0
       UNION
       SELECT telegram_id FROM profiles
       UNION
       SELECT telegram_id FROM search_preferences
       UNION
       SELECT telegram_id FROM favorites
     )
     WHERE telegram_id IS NOT NULL`
  ).first();

  return row?.count || 0;
}

async function sendBroadcastMessage(chatId, text, env) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
    });

    return { ok: response.ok, status: response.status };
  } catch (error) {
    console.error("Broadcast send error:", error);
    return { ok: false, status: 0 };
  }
}

async function markUserBlocked(chatId, env) {
  try {
    await env.x_roommate_db.prepare(
      "UPDATE bot_users SET is_blocked = 1 WHERE telegram_id = ?"
    ).bind(chatId).run();
  } catch (error) {
    console.error("markUserBlocked error:", error);
  }
}

async function startAdminReports(chatId, env) {
  if (!(await isAdmin(chatId, env))) {
    await sendMessage(chatId, "Этот раздел доступен только администратору.", env);
    return;
  }

  await setSession(chatId, "admin_reports_results", { last_id: 0 }, env);
  await showNextReport(chatId, env);
}

async function showNextReport(chatId, env) {
  if (!(await isAdmin(chatId, env))) {
    await sendMessage(chatId, "Этот раздел доступен только администратору.", env);
    return;
  }

  let session = await getSession(chatId, env);

  if (!session || session.step !== "admin_reports_results") {
    session = { step: "admin_reports_results", data: { last_id: 0 } };
    await setSession(chatId, "admin_reports_results", session.data, env);
  }

  const lastId = session.data.last_id || 0;
  let report = await getNextReport(lastId, env);

  if (!report) {
    report = await getNextReport(0, env);
  }

  if (!report) {
    await sendMessage(chatId, "Новых жалоб нет ✅\n\nВсе жалобы закрыты или обработаны.", env, adminPanelKeyboard());
    return;
  }

  await setSession(chatId, "admin_reports_results", { last_id: report.report_id }, env);

  const reportCount = await getReportCountForProfile(report.id, env);
  const prefix = formatAdminReportPrefix(report, reportCount);

  await sendProfile(chatId, report, env, adminReportKeyboard(report), "", prefix);
}

async function getNextReport(lastId, env) {
  const report = await env.x_roommate_db.prepare(
    `SELECT
       r.id AS report_id,
       r.reason AS report_reason,
       r.status AS report_status,
       r.reporter_telegram_id,
       r.created_at AS report_created_at,
       p.*
     FROM reports r
     JOIN profiles p ON p.id = r.reported_profile_id
     WHERE r.status = 'new'
       AND r.id > ?
     ORDER BY r.id ASC
     LIMIT 1`
  ).bind(lastId || 0).first();

  return report || null;
}

async function getReportCountForProfile(profileId, env) {
  const row = await env.x_roommate_db.prepare(
    "SELECT COUNT(*) AS count FROM reports WHERE reported_profile_id = ?"
  ).bind(profileId).first();

  return row?.count || 0;
}

async function startAdminVerificationRequests(chatId, env) {
  await setSession(chatId, "admin_verification_requests", { last_id: 0 }, env);
  await showNextVerificationRequest(chatId, env);
}

async function showNextVerificationRequest(chatId, env) {
  let session = await getSession(chatId, env);

  if (!session || session.step !== "admin_verification_requests") {
    session = { step: "admin_verification_requests", data: { last_id: 0 } };
    await setSession(chatId, "admin_verification_requests", session.data, env);
  }

  const lastId = session.data.last_id || 0;
  let request = await getNextVerificationRequest(lastId, env);

  if (!request) {
    request = await getNextVerificationRequest(0, env);
  }

  if (!request) {
    await sendMessage(chatId, "Заявок на проверку нет ✅", env, adminPanelKeyboard());
    return;
  }

  await setSession(chatId, "admin_verification_requests", { last_id: request.request_id }, env);

  const prefix = `✅ Заявка на проверку #${request.request_id}

Статус: ${request.request_status}
Дата: ${request.request_created_at}
Пользователь Telegram ID: ${request.telegram_id}`;

  await sendProfile(chatId, request, env, adminVerificationRequestKeyboard(request), "", prefix);
}

async function getNextVerificationRequest(lastId, env) {
  const request = await env.x_roommate_db.prepare(
    `SELECT
       vr.id AS request_id,
       vr.status AS request_status,
       vr.created_at AS request_created_at,
       p.*
     FROM verification_requests vr
     JOIN profiles p ON p.id = vr.profile_id
     WHERE vr.status = 'pending'
       AND p.is_active = 1
       AND vr.id > ?
     ORDER BY vr.id ASC
     LIMIT 1`
  ).bind(lastId || 0).first();

  return request || null;
}

function adminVerificationRequestKeyboard(request) {
  const buttons = [];

  if (request.contact_username) {
    buttons.push([{ text: "💬 Написать владельцу", url: `https://t.me/${request.contact_username}` }]);
  }

  buttons.push([{ text: "✅ Подтвердить", callback_data: `admin_approve_verification_request:${request.request_id}` }]);
  buttons.push([{ text: "❌ Отклонить", callback_data: `admin_reject_verification_request:${request.request_id}` }]);
  buttons.push([{ text: "➡️ Следующая заявка", callback_data: "admin_verification_next" }]);
  buttons.push([{ text: "🧰 Админ-панель", callback_data: "admin_panel" }]);

  return { inline_keyboard: buttons };
}

async function approveVerificationRequest(chatId, requestId, env) {
  const request = await env.x_roommate_db.prepare(
    `SELECT vr.*, p.telegram_id AS owner_telegram_id, p.id AS profile_id
     FROM verification_requests vr
     JOIN profiles p ON p.id = vr.profile_id
     WHERE vr.id = ?`
  ).bind(requestId).first();

  if (!request) {
    await sendMessage(chatId, "Заявка не найдена.", env, adminPanelKeyboard());
    return;
  }

  await env.x_roommate_db.prepare(
    "UPDATE profiles SET verified_profile = 1, verified_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(request.profile_id).run();

  await env.x_roommate_db.prepare(
    "UPDATE verification_requests SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ?"
  ).bind(chatId, requestId).run();

  await logEvent(request.owner_telegram_id, "verification_approved", String(request.profile_id), env);

  await sendMessage(chatId, "Анкета подтверждена ✅", env, {
    inline_keyboard: [
      [{ text: "➡️ Следующая заявка", callback_data: "admin_verification_next" }],
      [{ text: "🧰 Админ-панель", callback_data: "admin_panel" }]
    ]
  });

  await sendMessage(
    request.owner_telegram_id,
    "Твоя анкета проверена ✅\n\nТеперь в профиле будет отображаться статус «Проверенная анкета».",
    env,
    await mainMenuKeyboard(request.owner_telegram_id, env)
  );
}

async function rejectVerificationRequest(chatId, requestId, env) {
  const request = await env.x_roommate_db.prepare(
    `SELECT vr.*, p.telegram_id AS owner_telegram_id, p.id AS profile_id
     FROM verification_requests vr
     JOIN profiles p ON p.id = vr.profile_id
     WHERE vr.id = ?`
  ).bind(requestId).first();

  if (!request) {
    await sendMessage(chatId, "Заявка не найдена.", env, adminPanelKeyboard());
    return;
  }

  await env.x_roommate_db.prepare(
    "UPDATE verification_requests SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ?"
  ).bind(chatId, requestId).run();

  await logEvent(request.owner_telegram_id, "verification_rejected", String(request.profile_id), env);

  await sendMessage(chatId, "Заявка отклонена ❌", env, {
    inline_keyboard: [
      [{ text: "➡️ Следующая заявка", callback_data: "admin_verification_next" }],
      [{ text: "🧰 Админ-панель", callback_data: "admin_panel" }]
    ]
  });

  await sendMessage(
    request.owner_telegram_id,
    "Заявка на проверку анкеты отклонена.\n\nТы можешь отредактировать анкету и отправить запрос позже.",
    env,
    await mainMenuKeyboard(request.owner_telegram_id, env)
  );
}

function formatAdminReportPrefix(report, reportCount) {
  const ownerUsername = report.contact_username ? `@${report.contact_username}` : "username не указан";

  return `🚩 Жалоба #${report.report_id}

Причина: ${formatReportReason(report.report_reason)}
Всего жалоб на эту анкету: ${reportCount}
Статус жалобы: ${report.report_status}
Дата: ${report.report_created_at}

Заявитель Telegram ID: ${report.reporter_telegram_id}
Владелец Telegram ID: ${report.telegram_id}
Владелец: ${ownerUsername}`;
}

function adminReportKeyboard(report) {
  const buttons = [];

  if (report.contact_username) {
    buttons.push([{ text: "💬 Написать владельцу", url: `https://t.me/${report.contact_username}` }]);
  }

  buttons.push([{ text: "📩 Уведомить владельца", callback_data: `admin_notify_owner:${report.report_id}` }]);

  if (Number(report.verified_profile) === 1) {
    buttons.push([{ text: "↩️ Снять проверку", callback_data: `admin_unverify_profile:${report.id}` }]);
  } else {
    buttons.push([{ text: "✅ Подтвердить анкету", callback_data: `admin_verify_profile:${report.id}` }]);
  }

  buttons.push([{ text: "🙈 Скрыть анкету", callback_data: `admin_hide_reported_profile:${report.report_id}` }]);
  buttons.push([{ text: "✅ Закрыть жалобу", callback_data: `admin_close_report:${report.report_id}` }]);
  buttons.push([{ text: "➡️ Следующая жалоба", callback_data: "admin_reports_next" }]);
  buttons.push([{ text: "🧰 Админ-панель", callback_data: "admin_panel" }]);

  return { inline_keyboard: buttons };
}

async function closeReport(chatId, reportId, env) {
  const report = await env.x_roommate_db.prepare("SELECT * FROM reports WHERE id = ?").bind(reportId).first();

  if (!report) {
    await sendMessage(chatId, "Жалоба не найдена.", env, adminPanelKeyboard());
    return;
  }

  await env.x_roommate_db.prepare("UPDATE reports SET status = 'closed' WHERE id = ?").bind(reportId).run();

  await sendMessage(chatId, "Жалоба закрыта ✅\n\nАнкета осталась активной.", env, {
    inline_keyboard: [
      [{ text: "➡️ Следующая жалоба", callback_data: "admin_reports_next" }],
      [{ text: "🧰 Админ-панель", callback_data: "admin_panel" }]
    ]
  });
}

async function hideReportedProfile(chatId, reportId, env) {
  const report = await env.x_roommate_db.prepare(
    `SELECT r.*, p.telegram_id AS owner_telegram_id, p.name AS owner_name
     FROM reports r
     JOIN profiles p ON p.id = r.reported_profile_id
     WHERE r.id = ?`
  ).bind(reportId).first();

  if (!report) {
    await sendMessage(chatId, "Жалоба не найдена.", env, adminPanelKeyboard());
    return;
  }

  await env.x_roommate_db.prepare("UPDATE profiles SET is_active = 0, is_approved = 0 WHERE id = ?").bind(report.reported_profile_id).run();
  await env.x_roommate_db.prepare("UPDATE reports SET status = 'hidden' WHERE reported_profile_id = ? AND status = 'new'").bind(report.reported_profile_id).run();

  await sendMessage(
    report.owner_telegram_id,
    "Твоя анкета временно скрыта после проверки жалобы модератором.\n\nТы можешь создать новую анкету или отредактировать текущую, после чего она снова уйдёт на модерацию.",
    env,
    await mainMenuKeyboard(report.owner_telegram_id, env)
  );

  await sendMessage(chatId, `Анкета скрыта 🙈\n\nВладелец: ${report.owner_name}\nВсе новые жалобы по этой анкете помечены как обработанные.`, env, {
    inline_keyboard: [
      [{ text: "➡️ Следующая жалоба", callback_data: "admin_reports_next" }],
      [{ text: "🧰 Админ-панель", callback_data: "admin_panel" }]
    ]
  });
}

async function notifyReportedProfileOwner(chatId, reportId, env) {
  const report = await env.x_roommate_db.prepare(
    `SELECT r.*, p.telegram_id AS owner_telegram_id, p.name AS owner_name
     FROM reports r
     JOIN profiles p ON p.id = r.reported_profile_id
     WHERE r.id = ?`
  ).bind(reportId).first();

  if (!report) {
    await sendMessage(chatId, "Жалоба не найдена.", env, adminPanelKeyboard());
    return;
  }

  await sendMessage(
    report.owner_telegram_id,
    "Администратор проверяет жалобу на твою анкету 🚩\n\nПожалуйста, проверь, что в анкете нет ошибок, спама или неприемлемого текста. Если нужно — отредактируй анкету через меню.",
    env,
    await mainMenuKeyboard(report.owner_telegram_id, env)
  );

  await sendMessage(chatId, `Владельцу анкеты отправлено уведомление 📩\n\nВладелец: ${report.owner_name}`, env, {
    inline_keyboard: [
      [{ text: "✅ Закрыть жалобу", callback_data: `admin_close_report:${reportId}` }],
      [{ text: "🙈 Скрыть анкету", callback_data: `admin_hide_reported_profile:${reportId}` }],
      [{ text: "➡️ Следующая жалоба", callback_data: "admin_reports_next" }],
      [{ text: "🧰 Админ-панель", callback_data: "admin_panel" }]
    ]
  });
}

async function confirmDelete(chatId, env) {
  await sendMessage(chatId, "Удалить твою анкету?", env, {
    inline_keyboard: [
      [{ text: "Да, удалить", callback_data: "delete_confirm" }],
      [{ text: "Отмена", callback_data: "menu" }]
    ]
  });
}

async function deleteProfile(chatId, env) {
  await env.x_roommate_db.prepare("UPDATE profiles SET is_active = 0 WHERE telegram_id = ?").bind(chatId).run();
  await clearSession(chatId, env);
  await sendMessage(chatId, "Анкета удалена 🗑", env, await mainMenuKeyboard(chatId, env));
}

async function showStats(chatId, env) {
  const total = await countRows(env, "SELECT COUNT(*) AS count FROM profiles");
  const active = await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE is_active = 1");
  const approved = await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE is_active = 1 AND is_approved = 1");
  const pending = await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE is_active = 1 AND is_approved = 0");
  const deleted = await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE is_active = 0");
  const preferences = await countRows(env, "SELECT COUNT(*) AS count FROM search_preferences");
  const favorites = await countRows(env, "SELECT COUNT(*) AS count FROM favorites");
  const found = await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE found_roommate = 1");
  const verified = await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE is_active = 1 AND verified_profile = 1");
  const reports = await countRows(env, "SELECT COUNT(*) AS count FROM reports");
  const newReports = await countRows(env, "SELECT COUNT(*) AS count FROM reports WHERE status = 'new'");
  const usersTotal = await countRows(env, "SELECT COUNT(*) AS count FROM bot_users");
  const searchesWeek = await countRows(env, "SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'search_started' AND created_at >= datetime('now', '-7 days')");

  const text = `📊 Краткая статистика бота

Пользователей: ${usersTotal}
Всего анкет: ${total}
Активных анкет: ${active}
Одобренных анкет: ${approved}
Проверенных анкет: ${verified}
На модерации: ${pending}
Удалённых / скрытых анкет: ${deleted}
Соседа нашли: ${found}
Сохранённых предпочтений: ${preferences}
Анкет в избранном: ${favorites}
Жалоб всего: ${reports}
Новых жалоб: ${newReports}
Поисков за 7 дней: ${searchesWeek}`;

  await sendMessage(
    chatId,
    text,
    env,
    {
      inline_keyboard: [
        [{ text: "📈 Расширенная аналитика", callback_data: "admin_analytics" }],
        [{ text: "🧰 Админ-панель", callback_data: "admin_panel" }],
        [{ text: "⬅️ В меню", callback_data: "menu" }]
      ]
    }
  );
}

async function showPendingProfile(chatId, env) {
  const profile = await env.x_roommate_db.prepare("SELECT * FROM profiles WHERE is_active = 1 AND is_approved = 0 ORDER BY id ASC LIMIT 1").first();

  if (!profile) {
    await sendMessage(chatId, "Анкет на модерации нет ✅", env, await mainMenuKeyboard(chatId, env));
    return;
  }

  await sendProfile(
    chatId,
    profile,
    env,
    {
      inline_keyboard: [
        [{ text: "✅ Одобрить", callback_data: `approve:${profile.id}` }],
        [{ text: "✅ Одобрить и подтвердить", callback_data: `approve_verify:${profile.id}` }],
        [{ text: "📝 Нужны правки", callback_data: `needs_changes:${profile.id}` }],
        [{ text: "❌ Отклонить", callback_data: `reject:${profile.id}` }],
        [{ text: "⬅️ В меню", callback_data: "menu" }]
      ]
    },
    "",
    "🛡 Анкета на модерации:"
  );
}

async function approveProfile(profileId, adminChatId, env, markVerified = false) {
  const profile = await env.x_roommate_db.prepare("SELECT * FROM profiles WHERE id = ?").bind(profileId).first();

  if (!profile) {
    await sendMessage(adminChatId, "Анкета не найдена.", env);
    return;
  }

  if (markVerified) {
    await env.x_roommate_db.prepare(
      "UPDATE profiles SET is_approved = 1, is_active = 1, verified_profile = 1, verified_at = CURRENT_TIMESTAMP, moderation_status = 'approved', moderation_comment = NULL WHERE id = ?"
    ).bind(profileId).run();

    await logEvent(profile.telegram_id, "profile_verified", JSON.stringify({ by_admin: adminChatId, source: "moderation" }), env);
    await sendMessage(adminChatId, "Анкета одобрена и подтверждена ✅", env);
    await sendMessage(
      profile.telegram_id,
      "Твоя анкета одобрена и получила статус проверенной ✅\nТеперь она доступна в поиске с отметкой доверия.",
      env,
      await mainMenuKeyboard(profile.telegram_id, env)
    );
    return;
  }

  await env.x_roommate_db.prepare("UPDATE profiles SET is_approved = 1, is_active = 1, moderation_status = 'approved', moderation_comment = NULL WHERE id = ?").bind(profileId).run();

  await sendMessage(adminChatId, "Анкета одобрена ✅", env);
  await sendMessage(profile.telegram_id, "Твоя анкета одобрена ✅\nТеперь она доступна в поиске.", env, await mainMenuKeyboard(profile.telegram_id, env));
}

async function verifyProfile(profileId, adminChatId, env) {
  const profile = await env.x_roommate_db.prepare("SELECT * FROM profiles WHERE id = ?").bind(profileId).first();

  if (!profile) {
    await sendMessage(adminChatId, "Анкета не найдена.", env, adminPanelKeyboard());
    return;
  }

  await env.x_roommate_db.prepare(
    "UPDATE profiles SET verified_profile = 1, verified_at = CURRENT_TIMESTAMP, is_approved = 1, is_active = 1 WHERE id = ?"
  ).bind(profileId).run();

  await logEvent(profile.telegram_id, "profile_verified", JSON.stringify({ by_admin: adminChatId, source: "admin_action" }), env);

  await sendMessage(
    adminChatId,
    `Анкета подтверждена ✅

Пользователь: ${profile.name}`,
    env,
    adminPanelKeyboard()
  );

  await sendMessage(
    profile.telegram_id,
    "Твоя анкета получила статус проверенной ✅\nТеперь в поиске рядом с ней будет отображаться отметка доверия.",
    env,
    await mainMenuKeyboard(profile.telegram_id, env)
  );
}

async function unverifyProfile(profileId, adminChatId, env) {
  const profile = await env.x_roommate_db.prepare("SELECT * FROM profiles WHERE id = ?").bind(profileId).first();

  if (!profile) {
    await sendMessage(adminChatId, "Анкета не найдена.", env, adminPanelKeyboard());
    return;
  }

  await env.x_roommate_db.prepare(
    "UPDATE profiles SET verified_profile = 0, verified_at = NULL WHERE id = ?"
  ).bind(profileId).run();

  await logEvent(profile.telegram_id, "profile_unverified", JSON.stringify({ by_admin: adminChatId }), env);

  await sendMessage(
    adminChatId,
    `Статус проверки снят ↩️

Пользователь: ${profile.name}`,
    env,
    adminPanelKeyboard()
  );

  await sendMessage(
    profile.telegram_id,
    "Статус проверки твоей анкеты был снят модератором. Анкета может оставаться доступной в поиске, если она одобрена.",
    env,
    await mainMenuKeyboard(profile.telegram_id, env)
  );
}

async function rejectProfile(profileId, adminChatId, env) {
  const profile = await env.x_roommate_db.prepare("SELECT * FROM profiles WHERE id = ?").bind(profileId).first();

  if (!profile) {
    await sendMessage(adminChatId, "Анкета не найдена.", env);
    return;
  }

  await env.x_roommate_db.prepare("UPDATE profiles SET is_active = 0, is_approved = 0, moderation_status = 'rejected' WHERE id = ?").bind(profileId).run();

  await sendMessage(adminChatId, "Анкета отклонена ❌", env);
  await sendMessage(profile.telegram_id, "Твоя анкета отклонена модератором.\nМожно создать новую анкету через меню.", env, await mainMenuKeyboard(profile.telegram_id, env));
}

async function exportMvpReport(chatId, env) {
  const metrics = {
    usersTotal: await countRows(env, "SELECT COUNT(*) AS count FROM bot_users"),
    usersNewToday: await countRows(env, "SELECT COUNT(*) AS count FROM bot_users WHERE created_at >= date('now')"),
    usersNew7d: await countRows(env, "SELECT COUNT(*) AS count FROM bot_users WHERE created_at >= datetime('now', '-7 days')"),
    usersActiveToday: await countRows(env, "SELECT COUNT(*) AS count FROM bot_users WHERE last_seen_at >= date('now')"),
    usersActive7d: await countRows(env, "SELECT COUNT(*) AS count FROM bot_users WHERE last_seen_at >= datetime('now', '-7 days')"),

    profilesTotal: await countRows(env, "SELECT COUNT(*) AS count FROM profiles"),
    profilesActive: await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE is_active = 1"),
    profilesApproved: await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE is_active = 1 AND is_approved = 1"),
    profilesVerified: await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE is_active = 1 AND verified_profile = 1"),
    profilesPending: await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE is_active = 1 AND is_approved = 0"),
    foundRoommateTotal: await countRows(env, "SELECT COUNT(*) AS count FROM profiles WHERE found_roommate = 1"),

    searchesToday: await countRows(env, "SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'search_started' AND created_at >= date('now')"),
    searches7d: await countRows(env, "SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'search_started' AND created_at >= datetime('now', '-7 days')"),
    favoritesTotal: await countRows(env, "SELECT COUNT(*) AS count FROM favorites"),
    hiddenProfilesTotal: await countRows(env, "SELECT COUNT(*) AS count FROM hidden_profiles"),

    reportsTotal: await countRows(env, "SELECT COUNT(*) AS count FROM reports"),
    reportsNew: await countRows(env, "SELECT COUNT(*) AS count FROM reports WHERE status = 'new'"),
    reports7d: await countRows(env, "SELECT COUNT(*) AS count FROM reports WHERE created_at >= datetime('now', '-7 days')"),

    contactClicksTotal: await countRows(env, "SELECT COUNT(*) AS count FROM contact_feedback"),
    contactsSuccessTotal: await countRows(env, "SELECT COUNT(*) AS count FROM contact_feedback WHERE contact_status = 'success'"),
    contactsFailedTotal: await countRows(env, "SELECT COUNT(*) AS count FROM contact_feedback WHERE contact_status = 'failed'"),
    contactsRelevantTotal: await countRows(env, "SELECT COUNT(*) AS count FROM contact_feedback WHERE relevance = 'relevant'"),
    contactsIrrelevantTotal: await countRows(env, "SELECT COUNT(*) AS count FROM contact_feedback WHERE relevance = 'irrelevant'"),

    verificationRequestsPending: await countRows(env, "SELECT COUNT(*) AS count FROM verification_requests WHERE status = 'pending'"),
    verificationRequestsApproved: await countRows(env, "SELECT COUNT(*) AS count FROM verification_requests WHERE status = 'approved'"),
    verificationRequestsRejected: await countRows(env, "SELECT COUNT(*) AS count FROM verification_requests WHERE status = 'rejected'"),

    broadcastsTotal: await countRows(env, "SELECT COUNT(*) AS count FROM broadcast_logs"),
    broadcastsSentTotal: await countRows(env, "SELECT COALESCE(SUM(sent_count), 0) AS count FROM broadcast_logs"),
    broadcastsFailedTotal: await countRows(env, "SELECT COALESCE(SUM(failed_count), 0) AS count FROM broadcast_logs")
  };

  const reportText = buildHumanReadableMvpReport(metrics);
  const csv = buildMvpMetricsCsv(metrics);

  await sendDocument(chatId, "studenthome_mvp_report.txt", reportText, env, "text/plain;charset=utf-8");
  await sendDocument(chatId, "studenthome_mvp_metrics.csv", csv, env, "text/csv;charset=utf-8");

  await sendMessage(
    chatId,
    `Готово ✅

Отправил два файла:
1. человекочитаемый MVP-отчёт TXT
2. сырой CSV с метриками для таблиц`,
    env,
    adminPanelKeyboard()
  );

  await logEvent(chatId, "mvp_report_exported", "human_readable_v4_5_1", env);
}

function buildHumanReadableMvpReport(metrics) {
  const reportDate = formatReportDate(new Date());

  const profileConversion = formatPercent(metrics.profilesTotal, metrics.usersTotal);
  const approvedConversion = formatPercent(metrics.profilesApproved, metrics.profilesTotal);
  const verifiedConversion = formatPercent(metrics.profilesVerified, metrics.profilesApproved);
  const contactSuccessConversion = formatPercent(metrics.contactsSuccessTotal, metrics.contactClicksTotal);
  const contactRelevantConversion = formatPercent(metrics.contactsRelevantTotal, metrics.contactClicksTotal);
  const foundRoommateConversion = formatPercent(metrics.foundRoommateTotal, metrics.profilesApproved);

  return (
`STUDENTHOME MVP REPORT
Дата формирования: ${reportDate}

1. Общая активность
Пользователей всего: ${metrics.usersTotal}
Новых пользователей сегодня: ${metrics.usersNewToday}
Новых пользователей за 7 дней: ${metrics.usersNew7d}
Активных пользователей сегодня: ${metrics.usersActiveToday}
Активных пользователей за 7 дней: ${metrics.usersActive7d}

2. Анкеты
Всего анкет: ${metrics.profilesTotal}
Активных анкет: ${metrics.profilesActive}
Одобренных анкет: ${metrics.profilesApproved}
Проверенных анкет: ${metrics.profilesVerified}
Анкет на модерации: ${metrics.profilesPending}
Пользователей отметили “Я нашёл соседа”: ${metrics.foundRoommateTotal}

3. Поиск и вовлечённость
Поисков сегодня: ${metrics.searchesToday}
Поисков за 7 дней: ${metrics.searches7d}
Добавлений в избранное: ${metrics.favoritesTotal}
Скрытых анкет: ${metrics.hiddenProfilesTotal}

4. Контакты и результат
Нажатий “Написать”: ${metrics.contactClicksTotal}
Успешных контактов: ${metrics.contactsSuccessTotal}
Неуспешных контактов: ${metrics.contactsFailedTotal}
Релевантных контактов: ${metrics.contactsRelevantTotal}
Нерелевантных контактов: ${metrics.contactsIrrelevantTotal}

5. Безопасность и доверие
Жалоб всего: ${metrics.reportsTotal}
Новых жалоб: ${metrics.reportsNew}
Жалоб за 7 дней: ${metrics.reports7d}
Заявок на проверку ожидают: ${metrics.verificationRequestsPending}
Заявок на проверку одобрено: ${metrics.verificationRequestsApproved}
Заявок на проверку отклонено: ${metrics.verificationRequestsRejected}

6. Админ-активность
Рассылок создано: ${metrics.broadcastsTotal}
Сообщений рассылки отправлено: ${metrics.broadcastsSentTotal}
Ошибок рассылки: ${metrics.broadcastsFailedTotal}

7. Конверсии MVP
Пользователь → анкета: ${profileConversion}
Анкета → одобрена: ${approvedConversion}
Одобренная анкета → проверенная: ${verifiedConversion}
Контакт → успешный контакт: ${contactSuccessConversion}
Контакт → релевантный контакт: ${contactRelevantConversion}
Одобренная анкета → “нашёл соседа”: ${foundRoommateConversion}

8. Ключевые выводы
${buildMvpInsights(metrics)}

9. Рекомендации
${buildMvpRecommendations(metrics)}
`);
}

function buildMvpMetricsCsv(metrics) {
  const rows = [
    ["metric", "value"],
    ["users_total", metrics.usersTotal],
    ["users_new_today", metrics.usersNewToday],
    ["users_new_7d", metrics.usersNew7d],
    ["users_active_today", metrics.usersActiveToday],
    ["users_active_7d", metrics.usersActive7d],
    ["profiles_total", metrics.profilesTotal],
    ["profiles_active", metrics.profilesActive],
    ["profiles_approved", metrics.profilesApproved],
    ["profiles_verified", metrics.profilesVerified],
    ["profiles_pending", metrics.profilesPending],
    ["found_roommate_total", metrics.foundRoommateTotal],
    ["searches_today", metrics.searchesToday],
    ["searches_7d", metrics.searches7d],
    ["favorites_total", metrics.favoritesTotal],
    ["hidden_profiles_total", metrics.hiddenProfilesTotal],
    ["reports_total", metrics.reportsTotal],
    ["reports_new", metrics.reportsNew],
    ["reports_7d", metrics.reports7d],
    ["contact_clicks_total", metrics.contactClicksTotal],
    ["contacts_success_total", metrics.contactsSuccessTotal],
    ["contacts_failed_total", metrics.contactsFailedTotal],
    ["contacts_relevant_total", metrics.contactsRelevantTotal],
    ["contacts_irrelevant_total", metrics.contactsIrrelevantTotal],
    ["verification_requests_pending", metrics.verificationRequestsPending],
    ["verification_requests_approved", metrics.verificationRequestsApproved],
    ["verification_requests_rejected", metrics.verificationRequestsRejected],
    ["broadcasts_total", metrics.broadcastsTotal],
    ["broadcasts_sent_total", metrics.broadcastsSentTotal],
    ["broadcasts_failed_total", metrics.broadcastsFailedTotal],
    ["conversion_user_to_profile", percentNumber(metrics.profilesTotal, metrics.usersTotal)],
    ["conversion_profile_to_approved", percentNumber(metrics.profilesApproved, metrics.profilesTotal)],
    ["conversion_approved_to_verified", percentNumber(metrics.profilesVerified, metrics.profilesApproved)],
    ["conversion_contact_to_success", percentNumber(metrics.contactsSuccessTotal, metrics.contactClicksTotal)],
    ["conversion_contact_to_relevant", percentNumber(metrics.contactsRelevantTotal, metrics.contactClicksTotal)],
    ["conversion_approved_to_found_roommate", percentNumber(metrics.foundRoommateTotal, metrics.profilesApproved)]
  ];

  return rows.map(row => row.map(csvEscape).join(",")).join("\n");
}

function buildMvpInsights(metrics) {
  const insights = [];

  insights.push(`• У сервиса ${metrics.usersTotal} пользователей, из них ${metrics.usersActive7d} были активны за последние 7 дней.`);
  insights.push(`• Создано ${metrics.profilesTotal} анкет, активных сейчас: ${metrics.profilesActive}.`);
  insights.push(`• Одобрено ${metrics.profilesApproved} анкет, проверенный статус получили ${metrics.profilesVerified}.`);
  insights.push(`• Пользователи выполнили ${metrics.searches7d} поисков за последние 7 дней.`);
  insights.push(`• В избранное добавлено ${metrics.favoritesTotal} анкет — это показывает интерес к сравнению кандидатов.`);
  insights.push(`• Зафиксировано ${metrics.contactClicksTotal} контактов, успешных: ${metrics.contactsSuccessTotal}, релевантных: ${metrics.contactsRelevantTotal}.`);
  insights.push(`• Пользователей, отметивших “Я нашёл соседа”: ${metrics.foundRoommateTotal}.`);

  if (metrics.reportsTotal > 0) {
    insights.push(`• Получено ${metrics.reportsTotal} жалоб — механизм пользовательской модерации уже используется.`);
  } else {
    insights.push("• Жалоб пока нет — нужно продолжать следить за качеством анкет при росте базы.");
  }

  return insights.join("\n");
}

function buildMvpRecommendations(metrics) {
  const recommendations = [];

  if (metrics.profilesApproved < 20) {
    recommendations.push("• Увеличить базу до 20–30 одобренных анкет, чтобы matching стал заметно полезнее.");
  }

  if (metrics.profilesVerified < Math.ceil(metrics.profilesApproved * 0.5)) {
    recommendations.push("• Повысить долю проверенных анкет — это усилит доверие пользователей.");
  }

  if (metrics.contactClicksTotal < 10) {
    recommendations.push("• Стимулировать пользователей нажимать “Написать” и оставлять обратную связь после контакта.");
  }

  if (metrics.foundRoommateTotal === 0) {
    recommendations.push("• Собрать первые кейсы “Я нашёл соседа” — это самая сильная метрика пользы MVP.");
  }

  if (metrics.reportsNew > 0) {
    recommendations.push("• Обработать новые жалобы в админ-панели и закрыть нерелевантные анкеты.");
  }

  if (metrics.usersTotal < 50) {
    recommendations.push("• Провести небольшой тестовый запуск: студенческие чаты, Telegram-канал, 10–20 интервью.");
  }

  if (!recommendations.length) {
    recommendations.push("• Продолжать масштабировать MVP и собирать качественную обратную связь от пользователей.");
  }

  return recommendations.join("\n");
}

function percentNumber(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function formatPercent(part, total) {
  if (!total) return "0%";
  return `${percentNumber(part, total)}%`;
}

function formatReportDate(date) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date) + " МСК";
  } catch (error) {
    return date.toISOString();
  }
}

async function exportProfilesCsv(chatId, env) {
  const rows = await env.x_roommate_db.prepare("SELECT * FROM profiles ORDER BY id ASC LIMIT 1000").all();

  const headers = [
    "id",
    "telegram_id",
    "username",
    "name",
    "age",
    "university",
    "budget",
    "district",
    "move_in_date",
    "housing_type",
    "lifestyle",
    "smoking",
    "pets",
    "about",
    "photo_file_id",
    "contact_username",
    "is_active",
    "is_approved",
    "verified_profile",
    "verified_at",
    "created_at"
  ];

  const csvRows = [headers.join(",")];

  for (const row of rows.results || []) {
    csvRows.push(headers.map(header => csvEscape(row[header])).join(","));
  }

  const csv = csvRows.join("\n");

  await sendDocument(chatId, "studenthome_profiles.csv", csv, env);
}

async function sendDocument(chatId, filename, content, env, contentType = null) {
  const formData = new FormData();
  const inferredContentType = contentType || inferDocumentContentType(filename);

  formData.append("chat_id", String(chatId));
  formData.append("document", new Blob([content], { type: inferredContentType }), filename);

  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendDocument`, {
    method: "POST",
    body: formData
  });
}

function inferDocumentContentType(filename) {
  const lower = String(filename || "").toLowerCase();

  if (lower.endsWith(".txt")) {
    return "text/plain;charset=utf-8";
  }

  if (lower.endsWith(".json")) {
    return "application/json;charset=utf-8";
  }

  return "text/csv;charset=utf-8";
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";

  const stringValue = String(value).replace(/"/g, '""');

  if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
    return `"${stringValue}"`;
  }

  return stringValue;
}

async function notifyAdminsAboutProfile(userChatId, env, title) {
  const admins = getAdminIds(env);

  if (!admins.length) return;

  const profile = await env.x_roommate_db.prepare("SELECT * FROM profiles WHERE telegram_id = ?").bind(userChatId).first();

  if (!profile) return;

  for (const adminId of admins) {
    await sendProfile(
      adminId,
      profile,
      env,
      {
        inline_keyboard: [
          [{ text: "✅ Одобрить", callback_data: `approve:${profile.id}` }],
          [{ text: "❌ Отклонить", callback_data: `reject:${profile.id}` }]
        ]
      },
      "",
      title
    );
  }
}

async function sendShareMessage(chatId, env) {
  const rawUsername = env.BOT_USERNAME || "";
  const botUsername = rawUsername.replace("@", "").replace("https://t.me/", "").replace("http://t.me/", "").trim();

  if (!botUsername || botUsername === "your_bot_username") {
    await sendMessage(chatId, "Ссылка для приглашения пока не настроена. Администратору нужно указать BOT_USERNAME в Cloudflare.", env, {
      inline_keyboard: [[{ text: "⬅️ В меню", callback_data: "menu" }]]
    });
    return;
  }

  const botLink = `https://t.me/${botUsername}`;
  const shareText = "Найди соседа для совместной аренды жилья через «X» Roommate Bot 👥";
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botLink)}&text=${encodeURIComponent(shareText)}`;

  await sendMessage(chatId, "Поделись ботом с другом 👇", env, {
    inline_keyboard: [
      [{ text: "📤 Поделиться", url: shareUrl }],
      [{ text: "🔗 Открыть бота", url: botLink }],
      [{ text: "⬅️ В меню", callback_data: "menu" }]
    ]
  });
}

async function sendProfile(chatId, profile, env, replyMarkup = null, extraText = "", prefix = "") {
  const text = `${prefix ? prefix + "\n\n" : ""}${formatProfile(profile)}${extraText || ""}`;

  if (profile.photo_file_id) {
    await sendPhoto(chatId, profile.photo_file_id, env);
    await sendMessage(chatId, text, env, replyMarkup);
    return;
  }

  await sendMessage(chatId, text, env, replyMarkup);
}

async function sendPhoto(chatId, photoFileId, env) {
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, photo: photoFileId })
  });
}

function getLargestPhotoFileId(message) {
  const photos = message.photo || [];

  if (!Array.isArray(photos) || photos.length === 0) {
    return null;
  }

  const bestPhoto = photos[photos.length - 1];

  return bestPhoto?.file_id || null;
}

function formatProfile(profile) {
  const verifiedText = Number(profile.verified_profile) === 1 ? "✅ Проверенная анкета\n" : "";

  return (
    verifiedText +
    `👤 ${profile.name}, ${profile.age}
` +
    `🎓 Университет: ${profile.university}
` +
    `💰 Бюджет: ${profile.budget} ₽/мес
` +
    `📍 Район: ${profile.district}
` +
    `📅 Заселение: ${profile.move_in_date}
` +
    `🏠 Тип жилья: ${profile.housing_type}
` +
    `🙂 Стиль жизни: ${profile.lifestyle}
` +
    `🚬 Курение: ${profile.smoking}
` +
    `🐾 Животные: ${profile.pets}

` +
    `📝 О себе:
${profile.about}`
  );
}

async function saveProfile(chatId, username, data, env) {
  await env.x_roommate_db.prepare(
    `INSERT OR REPLACE INTO profiles
     (
       telegram_id,
       username,
       name,
       age,
       university,
       budget,
       district,
       move_in_date,
       housing_type,
       lifestyle,
       smoking,
       pets,
       about,
       photo_file_id,
       contact_username,
       is_active,
       is_approved,
       moderation_status,
       moderation_comment
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'pending', NULL)`
  ).bind(
    chatId,
    username,
    data.name,
    data.age,
    data.university,
    data.budget,
    data.district,
    data.move_in_date,
    data.housing_type,
    data.lifestyle,
    data.smoking,
    data.pets,
    data.about,
    data.photo_file_id || null,
    username
  ).run();

  await logEvent(chatId, "profile_saved", null, env);
}

async function setSession(chatId, step, data, env) {
  await env.x_roommate_db.prepare(
    `INSERT OR REPLACE INTO sessions (telegram_id, step, data)
     VALUES (?, ?, ?)`
  ).bind(chatId, step, JSON.stringify(data)).run();
}

async function getSession(chatId, env) {
  const session = await env.x_roommate_db.prepare("SELECT * FROM sessions WHERE telegram_id = ?").bind(chatId).first();

  if (!session) return null;

  return {
    step: session.step,
    data: JSON.parse(session.data || "{}")
  };
}

async function clearSession(chatId, env) {
  await env.x_roommate_db.prepare("DELETE FROM sessions WHERE telegram_id = ?").bind(chatId).run();
}


async function upsertUser(user, env) {
  if (!user?.id) return;

  try {
    await env.x_roommate_db.prepare(
      `INSERT INTO bot_users
       (telegram_id, username, first_name, last_name, created_at, last_seen_at, is_blocked)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
       ON CONFLICT(telegram_id) DO UPDATE SET
         username = excluded.username,
         first_name = excluded.first_name,
         last_name = excluded.last_name,
         last_seen_at = CURRENT_TIMESTAMP,
         is_blocked = 0`
    ).bind(
      user.id,
      user.username || null,
      user.first_name || null,
      user.last_name || null
    ).run();
  } catch (error) {
    console.error("upsertUser error:", error);
  }
}

async function logEvent(chatId, eventType, meta, env) {
  try {
    await env.x_roommate_db.prepare(
      `INSERT INTO analytics_events (telegram_id, event_type, meta)
       VALUES (?, ?, ?)`
    ).bind(chatId || null, eventType, meta || null).run();
  } catch (error) {
    console.error("logEvent error:", error);
  }
}

async function countRows(env, sql, params = []) {
  try {
    const row = await env.x_roommate_db.prepare(sql).bind(...params).first();
    return row?.count || 0;
  } catch (error) {
    console.error("countRows error:", error);
    return 0;
  }
}

async function sendMessage(chatId, text, env, replyMarkup = null) {
  const body = {
    chat_id: chatId,
    text: text,
    disable_web_page_preview: true
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function answerCallback(callbackQueryId, env) {
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId })
  });
}

function getAdminIds(env) {
  if (!env.ADMIN_IDS) return [];

  return env.ADMIN_IDS.split(",").map(id => Number(id.trim())).filter(id => Number.isFinite(id));
}

async function isAdmin(chatId, env) {
  return getAdminIds(env).includes(Number(chatId));
}

function getQuickAction(text) {
  const normalized = text.trim().toLocaleLowerCase("ru-RU");

  if (normalized === "🏠 меню" || normalized === "меню") return "menu";
  if (normalized === "👥 найти соседа" || normalized === "найти соседа" || normalized === "👥 поиск" || normalized === "поиск") return "find";
  if (normalized === "📋 моя анкета" || normalized === "моя анкета" || normalized === "📋 анкета" || normalized === "анкета") return "me";
  if (normalized === "✏️ редактировать анкету" || normalized === "редактировать анкету") return "edit";
  if (normalized === "⚙️ предпочтения" || normalized === "⚙️ мои предпочтения" || normalized === "предпочтения" || normalized === "мои предпочтения") return "preferences";
  if (normalized === "⭐ избранное" || normalized === "избранное") return "favorites";
  if (normalized === "✅ нашёл соседа" || normalized === "✅ нашел соседа" || normalized === "нашёл соседа" || normalized === "нашел соседа" || normalized === "я нашёл соседа" || normalized === "я нашел соседа") return "found";
  if (normalized === "🧰 еще" || normalized === "🧰 ещё" || normalized === "еще" || normalized === "ещё") return "more";
  if (normalized === "🧰 админ-панель" || normalized === "🛠 админ" || normalized === "админ-панель" || normalized === "админ панель" || normalized === "админ") return "admin";
  if (normalized === "ℹ️ помощь" || normalized === "помощь") return "help";

  if (
    normalized === "🏠 menu" ||
    normalized === "menu"
  ) {
    return "menu";
  }

  if (
    normalized === "👥 search" ||
    normalized === "search" ||
    normalized === "find roommate" ||
    normalized === "👥 find roommate"
  ) {
    return "find";
  }

  if (
    normalized === "📋 profile" ||
    normalized === "profile" ||
    normalized === "my profile"
  ) {
    return "me";
  }

  if (
    normalized === "⭐ favorites" ||
    normalized === "favorites"
  ) {
    return "favorites";
  }

  if (
    normalized === "🌐 language" ||
    normalized === "language" ||
    normalized === "🌐 язык" ||
    normalized === "язык"
  ) {
    return "language";
  }

  return null;
}

function profileMatchesFilters(profile, filters = {}) {
  return calculateCompatibility(profile, filters) >= 35;
}

function hasActiveFilters(filters = {}) {
  return Boolean(
    normalizeText(filters.university) ||
    filters.minAge ||
    filters.maxAge ||
    filters.maxBudget ||
    normalizeText(filters.district) ||
    normalizeText(filters.housingType) ||
    normalizeText(filters.moveInDate) ||
    normalizeText(filters.lifestyle) ||
    normalizeText(filters.smoking) ||
    normalizeText(filters.pets)
  );
}

function calculateCompatibility(profile, filters = {}) {
  const criteria = getCompatibilityCriteria(profile, filters);

  if (!criteria.length) return 0;

  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const matchedWeight = criteria.reduce((sum, criterion) => sum + (criterion.matched ? criterion.weight : 0), 0);

  return Math.round((matchedWeight / totalWeight) * 100);
}

function getCompatibilityCriteria(profile, filters = {}) {
  const criteria = [];

  if (normalizeText(filters.university)) {
    criteria.push({
      label: "университет",
      weight: 15,
      matched: textMatches(profile.university, filters.university),
      details: `${formatCriterionValue(profile.university)} / ищешь: ${formatCriterionValue(filters.university)}`
    });
  }

  if (filters.minAge || filters.maxAge) {
    criteria.push({
      label: "возраст",
      weight: 5,
      matched: ageMatches(profile.age, filters.minAge, filters.maxAge),
      details: `${formatCriterionValue(profile.age)} / ищешь: ${formatAgePreference(filters.minAge, filters.maxAge)}`
    });
  }

  if (filters.maxBudget) {
    criteria.push({
      label: "бюджет",
      weight: 15,
      matched: budgetMatches(profile.budget, filters.maxBudget),
      details: `${formatCriterionValue(profile.budget)} ₽ / до ${filters.maxBudget} ₽`
    });
  }

  if (normalizeText(filters.district)) {
    criteria.push({
      label: "район",
      weight: 15,
      matched: textMatches(profile.district, filters.district),
      details: `${formatCriterionValue(profile.district)} / ищешь: ${formatCriterionValue(filters.district)}`
    });
  }

  if (normalizeText(filters.housingType)) {
    criteria.push({
      label: "тип жилья",
      weight: 12,
      matched: textMatches(profile.housing_type, filters.housingType),
      details: `${formatCriterionValue(profile.housing_type)} / ищешь: ${formatCriterionValue(filters.housingType)}`
    });
  }

  if (normalizeText(filters.moveInDate)) {
    criteria.push({
      label: "дата заселения",
      weight: 10,
      matched: textMatches(profile.move_in_date, filters.moveInDate),
      details: `${formatCriterionValue(profile.move_in_date)} / ищешь: ${formatCriterionValue(filters.moveInDate)}`
    });
  }

  if (normalizeText(filters.lifestyle)) {
    criteria.push({
      label: "стиль жизни",
      weight: 12,
      matched: textMatches(profile.lifestyle, filters.lifestyle),
      details: `${formatCriterionValue(profile.lifestyle)} / ищешь: ${formatCriterionValue(filters.lifestyle)}`
    });
  }

  if (normalizeText(filters.smoking)) {
    criteria.push({
      label: "курение",
      weight: 8,
      matched: choiceMatches(profile.smoking, filters.smoking),
      details: `${formatCriterionValue(profile.smoking)} / ищешь: ${formatCriterionValue(filters.smoking)}`
    });
  }

  if (normalizeText(filters.pets)) {
    criteria.push({
      label: "животные",
      weight: 8,
      matched: choiceMatches(profile.pets, filters.pets),
      details: `${formatCriterionValue(profile.pets)} / ищешь: ${formatCriterionValue(filters.pets)}`
    });
  }

  return criteria;
}

function formatCriterionValue(value) {
  if (value === null || value === undefined || value === "") return "не указано";
  return String(value);
}

function formatCompatibilityText(profile, filters = {}) {
  if (!hasActiveFilters(filters)) {
    return "🎯 Поиск без фильтров:";
  }

  const score = calculateCompatibility(profile, filters);
  let label = "низкий матч";

  if (score >= 80) {
    label = "высокий матч";
  } else if (score >= 55) {
    label = "средний матч";
  }

  const criteria = getCompatibilityCriteria(profile, filters);
  const matched = criteria.filter(criterion => criterion.matched);
  const differences = criteria.filter(criterion => !criterion.matched);

  let text = `🎯 Совпадение: ${score}% — ${label}`;

  if (matched.length) {
    text += "\n\nСильные совпадения:\n" + matched.map(formatCriterionLine).join("\n");
  }

  if (differences.length) {
    text += "\n\nВозможные различия:\n" + differences.map(formatCriterionLine).join("\n");
  }

  return text;
}

function formatCriterionLine(criterion) {
  const icon = criterion.matched ? "✅" : "⚠️";
  return `${icon} ${criterion.label}: ${criterion.details || "учтено"}`;
}


function calculateProfileQuality(profile) {
  const checks = [
    { weight: 8, done: hasValue(profile.name) },
    { weight: 8, done: hasValue(profile.age) },
    { weight: 10, done: hasValue(profile.university) },
    { weight: 10, done: hasValue(profile.budget) },
    { weight: 10, done: hasValue(profile.district) },
    { weight: 8, done: hasValue(profile.move_in_date) },
    { weight: 8, done: hasValue(profile.housing_type) },
    { weight: 8, done: hasValue(profile.lifestyle) },
    { weight: 6, done: hasValue(profile.smoking) },
    { weight: 6, done: hasValue(profile.pets) },
    { weight: 10, done: normalizeText(profile.about).length >= 40 },
    { weight: 8, done: hasValue(profile.photo_file_id) }
  ];

  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  const completed = checks.reduce((sum, check) => sum + (check.done ? check.weight : 0), 0);

  return Math.round((completed / total) * 100);
}

function formatProfileQualityText(profile) {
  const score = calculateProfileQuality(profile);
  const tips = getProfileQualityTips(profile);

  let level = "низкая";

  if (score >= 85) {
    level = "высокая";
  } else if (score >= 65) {
    level = "средняя";
  }

  let text = `📋 Заполненность анкеты: ${score}% (${level})`;

  if (tips.length) {
    text += `\n\nСоветы:\n${tips.map(tip => `• ${tip}`).join("\n")}`;
  }

  return text;
}

function getProfileQualityTips(profile) {
  const tips = [];

  if (!hasValue(profile.photo_file_id)) {
    tips.push("добавь фото — так анкета вызывает больше доверия");
  }

  if (normalizeText(profile.about).length < 40) {
    tips.push("расскажи подробнее о себе: график, привычки, что важно в соседе");
  }

  if (!hasValue(profile.move_in_date)) {
    tips.push("укажи примерную дату заселения");
  }

  if (!hasValue(profile.district)) {
    tips.push("укажи район или локацию, где удобно жить");
  }

  return tips.slice(0, 3);
}

function hasValue(value) {
  if (value === null || value === undefined) return false;

  const text = String(value).trim();

  return text !== "" && text !== "-";
}

function parseAgeRange(value) {
  if (isSkip(value)) return null;

  const text = normalizeText(value).replace(/\s/g, "");
  const rangeMatch = text.match(/^(\d{1,2})[-–—](\d{1,2})$/);

  if (rangeMatch) {
    const min = Number.parseInt(rangeMatch[1], 10);
    const max = Number.parseInt(rangeMatch[2], 10);

    if (Number.isFinite(min) && Number.isFinite(max) && min >= 16 && max <= 80 && min <= max) {
      return { min, max };
    }

    return null;
  }

  const single = Number.parseInt(text, 10);

  if (Number.isFinite(single) && single >= 16 && single <= 80) {
    return { min: single, max: single };
  }

  return null;
}

function ageMatches(profileAge, minAge, maxAge) {
  if (!minAge && !maxAge) return true;

  const age = Number.parseInt(profileAge, 10);

  if (!Number.isFinite(age)) return false;
  if (minAge && age < minAge) return false;
  if (maxAge && age > maxAge) return false;

  return true;
}

function normalizeText(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/[.,!?;:()[\]{}"'«»]/g, " ")
    .replace(/\s+/g, " ");
}

function textMatches(profileValue, filterValue) {
  const profileText = normalizeText(profileValue);
  const filterText = normalizeText(filterValue);

  if (!filterText) return true;
  if (!profileText) return false;

  return profileText.includes(filterText) || filterText.includes(profileText);
}

function budgetMatches(profileBudget, maxBudget) {
  if (!maxBudget) return true;

  const budget = Number.parseInt(String(profileBudget).replace(/\s/g, ""), 10);

  if (!Number.isFinite(budget)) return false;

  return budget <= maxBudget;
}

function choiceMatches(profileValue, filterValue) {
  const profileText = normalizeText(profileValue);
  const filterText = normalizeText(filterValue);

  if (!filterText) return true;
  if (!profileText) return false;

  if (isNegativeAnswer(filterText)) {
    return isNegativeAnswer(profileText);
  }

  if (isPositiveAnswer(filterText)) {
    return isPositiveAnswer(profileText) && !isNegativeAnswer(profileText);
  }

  return textMatches(profileText, filterText);
}

function isNegativeAnswer(value) {
  const text = normalizeText(value);

  return (
    text === "нет" ||
    text === "не" ||
    text.includes("нет") ||
    text.includes("без") ||
    text.includes("не курю") ||
    text.includes("не люблю") ||
    text.includes("нельзя") ||
    text.includes("no")
  );
}

function isPositiveAnswer(value) {
  const text = normalizeText(value);

  if (isNegativeAnswer(text)) return false;

  return (
    text === "да" ||
    text.includes("да") ||
    text.includes("есть") ||
    text.includes("можно") ||
    text.includes("курю") ||
    text.includes("люблю") ||
    text.includes("ок") ||
    text.includes("yes")
  );
}

function isSkip(text) {
  const normalized = normalizeText(text);

  return (
    normalized === "-" ||
    normalized === "не важно" ||
    normalized === "любой" ||
    normalized === "любая" ||
    normalized === "пропустить" ||
    normalized === "пропустить фото" ||
    normalized === "убрать фото"
  );
}

function normalizeFilter(text) {
  if (isSkip(text)) return "";
  return normalizeText(text);
}
