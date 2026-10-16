/*
 Treads Tracker frontend.
 Replace only the two configuration placeholders below.
 Use the Supabase publishable/anon key, NEVER a service-role or secret key.
*/
const SUPABASE_URL = "https://wdoezossfhorfdaznbxy.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_rmJ0saEe34YCktRtNPpluw_UEkKpPxP";

const configured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("PASTE_") &&
  SUPABASE_PUBLIC_KEY.length > 20 &&
  !SUPABASE_PUBLIC_KEY.includes("PASTE_");

const $ = (id) => document.getElementById(id);
let client = null;
let currentUser = null;
let currentProfile = null;
let submissions = [];
let completionStats = [];
let activeFilter = "all";

function setMessage(id, message, type = "") {
  const el = $(id);
  el.textContent = message || "";
  el.className = "message" + (type ? " " + type : "");
}
function show(el, yes) { el.classList.toggle("hidden", !yes); }
function friendlyError(error) {
  return error?.message || "Something went wrong. Please try again.";
}
function dateText(value) {
  if (!value) return "Date unavailable";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}
function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

async function start() {
  if (!configured) {
    show($("configNotice"), true);
    $("loginForm").querySelector("button").disabled = true;
    return;
  }
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
  $("loginForm").addEventListener("submit", signIn);
  $("signOutBtn").addEventListener("click", signOut);
  $("submissionForm").addEventListener("submit", submitRecord);
  $("refreshBtn").addEventListener("click", loadWorkspace);
  $("statusTabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === button));
    renderRecords();
  });
  client.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      currentUser = null;
      currentProfile = null;
      show($("loginView"), true);
      show($("appView"), false);
      show($("signOutBtn"), false);
    } else {
      currentUser = session.user;
      loadWorkspace();
    }
  });
  const { data, error } = await client.auth.getSession();
  if (error) setMessage("loginMessage", friendlyError(error), "error");
  if (data.session) {
    currentUser = data.session.user;
    await loadWorkspace();
  }
}

async function signIn(event) {
  event.preventDefault();
  setMessage("loginMessage", "Signing in…");
  const { error } = await client.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });
  if (error) setMessage("loginMessage", friendlyError(error), "error");
  else setMessage("loginMessage", "Signed in.", "success");
}

async function signOut() {
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) setMessage("recordsMessage", friendlyError(error), "error");
}

async function loadWorkspace() {
  if (!client || !currentUser) return;
  setMessage("recordsMessage", "Loading records…");
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (profileError) {
    setMessage("recordsMessage", "Could not load your profile: " + friendlyError(profileError), "error");
    return;
  }
  if (!profile || !["admin", "agent"].includes(profile.role)) {
    show($("loginView"), false);
    show($("appView"), true);
    show($("signOutBtn"), true);
    $("welcomeTitle").textContent = "Account setup required";
    $("welcomeSubtitle").textContent = "Your account does not have an assigned Treads Tracker profile. Ask an administrator to add your profile.";
    show($("agentFormPanel"), false);
    show($("statsGrid"), false);
    show($("recordsPanel"), false);
    setMessage("recordsMessage", "No authorized profile was found for this account.", "error");
    return;
  }

  currentProfile = profile;
  show($("loginView"), false);
  show($("appView"), true);
  show($("signOutBtn"), true);
  show($("statsGrid"), true);
  $("welcomeTitle").textContent = "Hello, " + (profile.full_name || (profile.role === "admin" ? "Administrator" : "Agent"));
  $("welcomeSubtitle").textContent = profile.role === "admin"
    ? "Review submissions and manage their status."
    : "Submit records and track your own submissions.";
  $("roleLabel").textContent = profile.role === "admin" ? "ADMIN WORKSPACE" : "AGENT WORKSPACE";
  $("rolePill").textContent = profile.role;
  $("recordsHeading").textContent = profile.role === "admin" ? "All submissions" : "Your submissions";
  show($("agentFormPanel"), profile.role === "agent");
  show($("allTimeStat"), profile.role === "admin");

  const { data: rows, error: rowsError } = await client
    .from("submissions")
    .select("id, agent_id, form_data, status, created_at")
    .order("created_at", { ascending: false });

  if (rowsError) {
    setMessage("recordsMessage", "Could not load submissions: " + friendlyError(rowsError), "error");
    return;
  }
  submissions = rows || [];

  if (profile.role === "admin") {
    const { data: stats, error: statsError } = await client
      .from("completion_stats")
      .select("id, completed_on");
    if (statsError) {
      completionStats = [];
      setMessage("recordsMessage", "Submissions loaded, but completion statistics could not be read: " + friendlyError(statsError), "error");
    } else {
      completionStats = stats || [];
    }
  } else {
    completionStats = [];
  }
  updateCounts();
  renderRecords();
  if (!rowsError) setMessage("recordsMessage", "");
}

function updateCounts() {
  $("pendingCount").textContent = submissions.filter(s => s.status === "pending").length;
  $("processingCount").textContent = submissions.filter(s => s.status === "processing").length;
  $("completedCount").textContent = submissions.filter(s => s.status === "completed").length;
  $("allTimeCount").textContent = completionStats.length;
}

function renderRecords() {
  const list = $("recordsList");
  list.replaceChildren();
  const filtered = submissions.filter(s => activeFilter === "all" || s.status === activeFilter);
  if (!filtered.length) {
    list.append(make("div", "empty", "No records in this section yet."));
    return;
  }
  for (const record of filtered) {
    const card = make("article", "record");
    const top = make("div", "record-top");
    const left = make("div");
    const data = record.form_data && typeof record.form_data === "object" ? record.form_data : {};
    left.append(make("h4", "", data.record_title || "Untitled record"));
    left.append(make("div", "record-meta", "Submitted " + dateText(record.created_at)));
    if (currentProfile?.role === "admin") left.append(make("div", "record-meta", "Agent account: " + record.agent_id));
    top.append(left);
    top.append(make("span", "status " + record.status, record.status));
    card.append(top);
    if (data.details) card.append(make("p", "record-details", data.details));
    const actions = make("div", "record-actions");
    if (currentProfile?.role === "admin" && ["pending", "processing"].includes(record.status)) {
      const complete = make("button", "button button-primary button-small", "Mark completed");
      complete.type = "button";
      complete.addEventListener("click", () => markCompleted(record.id, complete));
      actions.append(complete);
    }
    if (currentProfile?.role === "admin" && record.status === "completed") {
      const del = make("button", "button button-quiet button-small", "Delete completed record");
      del.type = "button";
      del.addEventListener("click", () => deleteCompleted(record.id, del));
      actions.append(del);
    }
    if (actions.childElementCount) card.append(actions);
    list.append(card);
  }
}

async function submitRecord(event) {
  event.preventDefault();
  if (currentProfile?.role !== "agent") return;
  const title = $("recordTitle").value.trim();
  const details = $("recordDetails").value.trim();
  if (!title || !details) {
    setMessage("submissionMessage", "Enter both a record title/reference and details.", "error");
    return;
  }
  const button = $("submissionForm").querySelector("button[type=submit]");
  button.disabled = true;
  const { error } = await client.from("submissions").insert({
    agent_id: currentUser.id,
    form_data: { record_title: title, details },
    status: "pending"
  });
  button.disabled = false;
  if (error) {
    setMessage("submissionMessage", friendlyError(error), "error");
    return;
  }
  $("submissionForm").reset();
  setMessage("submissionMessage", "Record submitted successfully.", "success");
  await loadWorkspace();
}

async function markCompleted(id, button) {
  if (!confirm("Mark this submission completed? The record will remain available in Completed.")) return;
  button.disabled = true;
  const { error } = await client.rpc("mark_submission_completed", { p_submission_id: id });
  button.disabled = false;
  if (error) {
    setMessage("recordsMessage", friendlyError(error), "error");
    return;
  }
  await loadWorkspace();
}

async function deleteCompleted(id, button) {
  if (!confirm("Permanently delete this completed submission from the live database? This cannot be undone from the website.")) return;
  button.disabled = true;
  const { error } = await client.rpc("delete_completed_submission", { p_submission_id: id });
  button.disabled = false;
  if (error) {
    setMessage("recordsMessage", friendlyError(error), "error");
    return;
  }
  setMessage("recordsMessage", "Completed submission deleted. The completion statistic remains.", "success");
  await loadWorkspace();
}

document.addEventListener("DOMContentLoaded", start);
