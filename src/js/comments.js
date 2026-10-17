(() => {
  function safeAuthorLink(value) {
    try { const url = new URL(value); return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  }

  function commentDate(value) {
    if (!value) return '작성일 미상';
    if (/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2})?$/.test(value)) return value.replace('T', ' ');
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR', {dateStyle: 'medium', timeStyle: 'short'});
  }

  function commentRows(comments) {
    const byId = new Map(comments.map(comment => [comment.id, comment]));
    const ordered = comments.filter(comment => comment.status !== 'deleted').sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)));
    const ids = new Set(ordered.map(comment => comment.id)), children = new Map(), visited = new Set(), rows = [];
    for (const comment of ordered) {
      let parent = comment.parent_id;
      const seen = new Set([comment.id]);
      while (byId.get(parent)?.status === 'deleted' && !seen.has(parent)) {
        seen.add(parent);
        parent = byId.get(parent).parent_id;
      }
      if (!ids.has(parent) || parent === comment.id) parent = null;
      if (!children.has(parent)) children.set(parent, []);
      children.get(parent).push(comment);
    }
    function append(branch) {
      const stack = branch.map(comment => ({comment, depth: 0, ancestors: []})).reverse();
      while (stack.length) {
        const row = stack.pop();
        if (visited.has(row.comment.id)) continue;
        visited.add(row.comment.id);
        const replies = children.get(row.comment.id) || [];
        rows.push({...row, replies: replies.length});
        for (let index = replies.length - 1; index >= 0; index--)
          stack.push({comment: replies[index], depth: row.depth + 1, ancestors: [...row.ancestors, row.comment.id]});
      }
    }
    const roots = children.get(null) || [];
    roots.sort((a, b) => {
      if (!a.created_at && b.created_at) return 1;
      if (a.created_at && !b.created_at) return -1;
      return String(b.created_at || '').localeCompare(String(a.created_at || '')) || String(a.id).localeCompare(String(b.id));
    });
    append(roots);
    append(ordered.filter(comment => !visited.has(comment.id)));
    return rows;
  }

  if (typeof module !== 'undefined') module.exports = {safeAuthorLink, commentRows, commentDate};
  if (typeof document === 'undefined') return;
  const root = document.querySelector('.comments[data-post-id]');
  if (!root) return;
  const postId = root.dataset.postId, expanded = new Set();
  let snapshot = null, activeEditor = null, pollTimer = null, pollFailures = 0, publicationPolls = 0, identityEpoch = 0;
  const clientId = crypto.randomUUID(), sequences = new Map(), likeIntentions = new Map(), commentIntentions = new Map(), busyComments = new Set();
  const failedRequests = new Map(), recoveredTasks = new Set(), publicationWaiting = new Set();

  function visibleSnapshot() {
    const result = {...snapshot, comments: snapshot.comments.map(comment => ({...comment}))};
    for (const [id, intention] of likeIntentions) {
      const item = id === null ? result : result.comments.find(comment => comment.id === id);
      if (!item) continue;
      const countKey = id === null ? 'post_likes' : 'likes', likedKey = id === null ? 'post_liked' : 'liked';
      item[countKey] = Math.max(0, item[countKey] + Number(intention.liked) - Number(item[likedKey]));
      item[likedKey] = intention.liked;
    }
    for (const [id, intention] of commentIntentions) {
      const index = result.comments.findIndex(comment => comment.id === id);
      if (index < 0 && intention.comment) result.comments.push(intention.comment);
      else if (index >= 0) Object.assign(result.comments[index], intention.patch);
    }
    return result;
  }

  function schedulePoll() {
    if (pollTimer || !snapshot) return;
    const working = snapshot.refreshing || (snapshot.tasks || []).some(task => ['queued', 'retrying'].includes(task.status));
    if (!working && !publicationPolls) return;
    pollTimer = setTimeout(async () => {
      pollTimer = null;
      try {
        update(await request('/api/comments?post=' + encodeURIComponent(postId)));
        pollFailures = 0;
        if (!working && publicationPolls) publicationPolls--;
      } catch {
        pollFailures++;
        notice.textContent = '저장 상태를 확인하지 못했습니다. 접수된 작업은 서버에서 계속 처리됩니다.';
        retry.hidden = false;
      }
      if (pollFailures < 5) schedulePoll();
    }, Math.min(1000 * 2 ** pollFailures, 16000));
  }

  function showTasks() {
    const tasks = snapshot.tasks || [];
    const failed = tasks.find(task => task.status === 'failed' && !recoveredTasks.has(task.id));
    if (failed) notice.textContent = failed.message || '댓글 저장에 실패했습니다. 다시 시도해 주세요.';
    else if (tasks.some(task => task.status === 'retrying')) notice.textContent = '저장을 다시 시도하고 있습니다.';
    else if (tasks.some(task => task.status === 'queued')) notice.textContent = '게시 처리 중입니다.';
    else if (!failedRequests.size) notice.textContent = '';
    schedulePoll();
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function commentBody(text) {
    const node = element('div', 'comment-body');
    let offset = 0;
    for (const match of text.matchAll(/\b(?:https?:\/\/|www\.)[^\s<>"'“”‘’]+/gi)) {
      let label = match[0].replace(/[.,!?;:，。！？；：]+$/, '');
      const pairs = {')': '(', ']': '[', '}': '{'};
      while (pairs[label.at(-1)] && label.split(label.at(-1)).length > label.split(pairs[label.at(-1)]).length)
        label = label.slice(0, -1).replace(/[.,!?;:，。！？；：]+$/, '');
      const href = safeAuthorLink(/^www\./i.test(label) ? 'https://' + label : label);
      if (!href) continue;
      node.append(document.createTextNode(text.slice(offset, match.index)));
      const link = element('a', '', label);
      link.href = href;
      link.target = '_blank';
      link.rel = 'nofollow ugc noopener noreferrer';
      node.append(link);
      offset = match.index + label.length;
    }
    node.append(document.createTextNode(text.slice(offset)));
    return node;
  }
  function button(text, action, className = '') {
    const node = element('button', className, text);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }
  const heading = root.querySelector('h2'), toolbar = element('div', 'comments-toolbar');
  const count = element('span', 'comments-count');
  const postLike = likeButton(null, 0, false);
  postLike.disabled = true;
  toolbar.append(heading, postLike, count);
  const notice = element('p', 'comments-notice');
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  const previewNotice = element('p', 'comments-help', '미리보기에서 작성한 댓글과 Like는 운영에 반영되지 않습니다.');
  previewNotice.hidden = true;
  const retry = button('다시 시도', () => action(retry, async () => {
    for (const operation of [...failedRequests.values()]) await operation();
    await load();
  }), 'comments-retry');
  retry.hidden = true;
  const commentHint = '댓글 (댓글 수정·삭제는 작성한 브라우저에서 가능합니다. 쿠키가 지워지면 권한을 잃으며, Like도 같은 브라우저를 기준으로 처리합니다.)';
  let composer;
  composer = editor();
  const taskFailures = element('div', 'comments-task-failures');
  const list = element('div', 'comments-list');
  const admin = element('details', 'comments-admin'), adminTitle = element('summary', '', '관리자');
  const adminBody = element('div', 'comments-admin-body');
  admin.append(adminTitle, adminBody);
  root.append(toolbar, notice, previewNotice, retry, composer.form, taskFailures, list, admin);
  heading.textContent = 'Comments';

  async function request(path, method = 'GET', payload) {
    const epoch = identityEpoch;
    const response = await fetch(path, {
      method, credentials: 'same-origin', headers: payload ? {'Content-Type': 'application/json'} : {},
      ...(payload ? {body: JSON.stringify(payload)} : {})
    });
    if(response.status===429){const error=new Error("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");error.status=429;throw error;}
    let result;
    try { result = await response.json(); } catch { throw new Error('댓글 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'); }
    if (!response.ok) {
      const error = new Error(result.message || '요청을 처리하지 못했습니다. 다시 시도해 주세요.');
      error.status = response.status;
      throw error;
    }
    return {...result, identityEpoch: epoch};
  }

  async function action(trigger, operation) {
    if (trigger.disabled) return;
    trigger.disabled = true;
    try { await operation(); }
    catch (error) { notice.textContent = error.message || '댓글 서비스에 연결할 수 없습니다. 작성한 내용은 유지됩니다.'; }
    finally { trigger.disabled = false; }
  }

  async function load() {
    retry.disabled = true;
    try {
      const result = await request('/api/comments?post=' + encodeURIComponent(postId));
      pollFailures = 0;
      update(result);
      if (!(snapshot.tasks || []).some(task => ['queued','retrying','failed'].includes(task.status))) notice.textContent = '';
      retry.hidden = failedRequests.size === 0;
    } catch {
      notice.textContent = '댓글을 일시적으로 불러올 수 없습니다. 본문은 계속 읽을 수 있으며 작성 중인 내용은 유지됩니다.';
      retry.hidden = false;
    } finally { retry.disabled = false; }
  }

  function updateLike(node, commentId, likes, liked) {
    node.textContent = (likes === 0 ? '🩶 ' : '❤️ ') + likes;
    node.setAttribute('aria-label', (commentId === null ? '이 글 좋아요 ' : '댓글 좋아요 ') + likes);
    node.setAttribute('aria-pressed', String(liked));
  }

  function likeButton(commentId, likes, liked) {
    const node = button('', () => {
      const restoreFocus = document.activeElement === node;
      const desired = node.getAttribute('aria-pressed') !== 'true';
      const sequence = (sequences.get(commentId) || 0) + 1;
      sequences.set(commentId, sequence);
      const intention = {liked: desired, sequence};
      failedRequests.delete('like-' + commentId);
      likeIntentions.set(commentId, intention);
      notice.textContent = '저장 중입니다.';
      render();
      if (restoreFocus) (commentId === null ? postLike : document.getElementById('comment-like-' + commentId))?.focus({preventScroll: true});
      const payload = {post_id: postId, comment_id: commentId, liked: desired, request_id: crypto.randomUUID(), client_id: clientId, sequence};
      const send = async () => {
        try {
          const result = await request('/api/likes', 'PUT', payload);
          if (sequences.get(commentId) === sequence) failedRequests.delete('like-' + commentId);
          if (likeIntentions.get(commentId) === intention) likeIntentions.delete(commentId);
          update(result);
        } catch (error) {
          if (likeIntentions.get(commentId) === intention) {
            likeIntentions.delete(commentId);
            if (!error.status || error.status >= 500) failedRequests.set('like-' + commentId, send);
            else failedRequests.delete('like-' + commentId);
            notice.textContent = error.message;
            retry.hidden = false;
            render();
          }
        }
      };
      send();
    }, 'comments-like');
    if (commentId !== null) node.id = 'comment-like-' + commentId;
    updateLike(node, commentId, likes, liked);
    return node;
  }

  function field(form, labelText, name, value = '', multiline = false) {
    const label = element('label', 'comments-field'), caption = element('span', '', labelText);
    const input = element(multiline ? 'textarea' : 'input');
    input.name = name;
    input.placeholder = labelText;
    input.value = value;
    input.required = name !== 'link';
    input.maxLength = name === 'body' ? 10000 : name === 'name' ? 80 : 2048;
    if (multiline) input.rows = 4;
    else {
      input.type = 'text';
      input.autocomplete = name === 'name' ? 'name' : 'url';
    }
    label.append(caption, input);
    form.append(label);
    return input;
  }

  function updateIdentity(editor) {
    const admin = Boolean(snapshot?.is_admin);
    editor.identity.hidden = admin;
    editor.name.disabled = editor.link.disabled = admin;
    editor.name.required = !admin;
  }

  function editor(comment = null, editing = false) {
    const form = element('form', 'comments-form');
    if (comment) form.append(element('p', 'comments-reply-target', editing ? '댓글 수정' : comment.author.name + '에게 답글'));
    const identity = element('div', 'comments-identity');
    const name = field(identity, '이름', 'name', editing ? comment.author.name : composer?.name?.value || '');
    const link = field(identity, '이메일 또는 홈페이지 (선택)', 'link', editing ? comment.author.link || '' : composer?.link?.value || '');
    const body = field(form, '댓글', 'body', editing ? comment.body : '', true);
    body.placeholder = commentHint;
    form.append(identity);
    const actions = element('div', 'comments-form-actions'), submit = element('button', 'comments-submit', editing ? '수정 저장' : comment ? '답글 등록' : '댓글 등록');
    submit.type = 'submit';
    submit.disabled = !snapshot;
    const result = {form, identity, name, link, body, submit, target: comment?.id, editing, requestId: null};
    updateIdentity(result);
    actions.append(submit);
    if (comment) actions.append(button('취소', () => {
      if (body.value !== (editing ? comment.body : '') && !confirm('작성 중인 내용을 취소할까요?')) return;
      activeEditor = null;
      renderList();
      document.getElementById('comment-' + comment.id)?.focus({preventScroll: true});
    }));
    form.append(actions);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      action(submit, async () => {
        const submittedBody = body.value;
        const payload = {post_id: postId, body: submittedBody};
        if (!snapshot.is_admin) Object.assign(payload, {name: name.value, link: link.value});
        if (!editing && comment) payload.parent_id = comment.id;
        if (editing) payload.expected_version = comment.version;
        const requestBody = JSON.stringify(payload);
        if (result.requestBody !== requestBody) { result.requestId = crypto.randomUUID(); result.requestBody = requestBody; }
        payload.request_id = result.requestId;
        const localId = editing ? comment.id : 'local-' + result.requestId;
        commentIntentions.set(localId, editing ? {patch: {body: submittedBody, saving: true}} : {comment: {
          id: localId, parent_id: comment?.id || null, author: {name: snapshot.is_admin ? '관리자' : name.value, link: link.value, is_admin: snapshot.is_admin},
          body: submittedBody, created_at: new Date().toISOString(), status: 'pending', likes: 0, liked: false, saving: true
        }});
        if (editing) busyComments.add(comment.id);
        result.inFlight = true;
        notice.textContent = '저장 중입니다.';
        render();
        try {
          const response = await request(editing ? '/api/comments/' + encodeURIComponent(comment.id) : '/api/comments', editing ? 'PATCH' : 'POST', payload);
          commentIntentions.delete(localId);
          if (body.value === submittedBody) {
            body.value = '';
            if (comment && activeEditor === result) activeEditor = null;
          }
          result.requestId = null;
          result.requestBody = null;
          update(response);
          showTasks();
          if (!(response.tasks || []).length) notice.textContent = response.pending ? '댓글이 접수되었습니다. 관리자 승인 후 공개됩니다.' : '댓글을 저장했습니다.';
        } catch (error) {
          commentIntentions.delete(localId);
          if (error.status && error.status < 500) {
            result.requestId = null; result.requestBody = null;
            if (error.status === 409) {
              await load();
              const current = snapshot.comments.find(item => item.id === comment?.id);
              if (current) comment.version = current.version;
            }
          }
          render();
          throw error;
        } finally {
          busyComments.delete(comment?.id);
          result.inFlight = false;
          render();
        }
      });
    });
    return result;
  }

  function openEditor(comment, editing) {
    if (activeEditor?.submit.disabled) { notice.textContent = '댓글 저장이 끝난 뒤 다른 답글을 작성해 주세요.'; return; }
    if (activeEditor && activeEditor.body.value.trim() && !confirm('작성 중인 내용을 취소하고 다른 댓글을 작성할까요?')) return;
    activeEditor = editor(comment, editing);
    if (!editing) expanded.add(comment.id);
    renderList();
    activeEditor.body.focus({preventScroll: true});
  }

  function renderList() {
    const focused = root.contains(document.activeElement) ? document.activeElement : null;
    const selection = focused && typeof focused.selectionStart === 'number' ? [focused.selectionStart, focused.selectionEnd] : null;
    list.replaceChildren();
    const visible = visibleSnapshot();
    const rows = commentRows(visible.comments);
    for (const row of rows) {
      const comment = row.comment;
      if (row.ancestors.some(id => !expanded.has(id))) continue;
      const article = element('article', 'comment');
      article.id = 'comment-' + comment.id;
      article.tabIndex = -1;
      article.style.setProperty('--comment-depth', Math.min(row.depth, 2));
      article.style.setProperty('--comment-depth-mobile', Math.min(row.depth, 1));
      const header = element('header', 'comment-header');
      const authorLink = safeAuthorLink(comment.author.link), author = element(authorLink ? 'a' : 'strong', 'comment-author', comment.author.name);
      if (authorLink) {
        author.href = authorLink;
        author.rel = 'nofollow ugc noopener noreferrer';
        if (!authorLink.startsWith('mailto:')) author.target = '_blank';
      }
      header.append(author);
      if (comment.author.is_admin) header.append(element('span', 'comment-badge', '관리자'));
      const task = (snapshot.tasks || []).find(task => task.comment_id === comment.id && ['queued','retrying'].includes(task.status));
      if (comment.saving) header.append(element('span', 'comment-badge', '저장 중'));
      else if (task) header.append(element('span', 'comment-badge', '게시 처리 중'));
      else if (comment.status === 'pending') header.append(element('span', 'comment-badge', snapshot.moderation ? '승인 대기' : '게시 처리 중'));
      const time = element(comment.created_at ? 'time' : 'span', 'comment-date');
      if (comment.created_at) time.dateTime = comment.created_at;
      time.textContent = commentDate(comment.created_at);
      header.append(time);
      if (comment.updated_at && comment.updated_at !== comment.created_at) header.append(element('span', 'comment-edited', '수정됨'));
      article.append(header);
      if (row.depth >= 2 && comment.parent_id) {
        const parent = visible.comments.find(item => item.id === row.ancestors.at(-1));
        if (parent) {
          const reference = element('a', row.depth >= 3 ? 'comment-parent' : 'comment-parent comment-parent-mobile', '↳ ' + parent.author.name + '에게 답글');
          reference.href = '#' + encodeURIComponent('comment-' + parent.id);
          reference.addEventListener('click', event => {
            event.preventDefault();
            for (const id of row.ancestors) expanded.add(id);
            renderList();
            const target = document.getElementById('comment-' + parent.id);
            target?.scrollIntoView({block: 'center'});
            target?.focus({preventScroll: true});
          });
          article.append(reference);
        }
      }
      article.append(commentBody(comment.body));
      const actions = element('div', 'comment-actions');
      if (!comment.id.startsWith('local-')) {
        actions.append(likeButton(comment.id, comment.likes, comment.liked));
        const reply = button('답글', () => openEditor(comment, false));
        reply.disabled = busyComments.has(comment.id);
        actions.append(reply);
        if (comment.can_edit) {
          const edit = button('수정', () => openEditor(comment, true));
          edit.disabled = busyComments.has(comment.id); actions.append(edit);
        }
        if (comment.can_delete) {
          const remove = button('삭제', () => action(remove, async () => {
            if (!confirm('댓글을 삭제할까요? 답글은 유지됩니다.')) return;
            if (activeEditor?.target === comment.id) activeEditor = null;
            const payload = {post_id: postId, request_id: crypto.randomUUID(), expected_version: comment.version};
            busyComments.add(comment.id);
            commentIntentions.set(comment.id, {patch: {status: 'deleted'}});
            notice.textContent = '저장 중입니다.';
            render();
            const send = async () => {
              try {
                const result = await request('/api/comments/' + encodeURIComponent(comment.id), 'DELETE', payload);
                failedRequests.delete(payload.request_id);
                commentIntentions.delete(comment.id);
                update(result); showTasks();
              } catch (error) {
                commentIntentions.delete(comment.id);
                if (!error.status || error.status >= 500) failedRequests.set(payload.request_id, send);
                else failedRequests.delete(payload.request_id);
                retry.hidden = false;
                render(); throw error;
              } finally { busyComments.delete(comment.id); render(); }
            };
            await send();
            document.getElementById('comment-' + comment.id)?.focus({preventScroll: true});
          }));
          remove.disabled = busyComments.has(comment.id);
          actions.append(remove);
        }
        if (snapshot.is_admin && comment.status === 'pending') {
          const approve = button('승인', () => action(approve, async () => {
            update(await request('/api/admin/comments/' + encodeURIComponent(comment.id) + '/approve', 'POST', {post_id: postId, request_id: crypto.randomUUID()}));
            showTasks();
            document.getElementById('comment-' + comment.id)?.focus({preventScroll: true});
          }));
          actions.append(approve);
        }
      }
      if (row.replies) {
        const toggle = button('답글 ' + row.replies + '개', () => {
          if (expanded.has(comment.id) && activeEditor && (activeEditor.target === comment.id || rows.some(item => item.comment.id === activeEditor.target && item.ancestors.includes(comment.id)))) {
            notice.textContent = '작성 중인 답글을 등록하거나 취소한 뒤 접어 주세요.';
            return;
          }
          if (expanded.has(comment.id)) expanded.delete(comment.id); else expanded.add(comment.id);
          renderList();
          document.getElementById('comment-toggle-' + comment.id)?.focus({preventScroll: true});
        }, 'comment-toggle');
        toggle.id = 'comment-toggle-' + comment.id;
        toggle.setAttribute('aria-expanded', String(expanded.has(comment.id)));
        actions.append(toggle);
      }
      article.append(actions);
      if (activeEditor?.target === comment.id) article.append(activeEditor.form);
      list.append(article);
    }
    if (!rows.length) list.append(element('p', 'comments-empty', '첫 댓글을 남겨 주세요.'));
    if (activeEditor && snapshot.comments.some(comment => comment.id === activeEditor.target && comment.status === 'deleted')) list.append(activeEditor.form);
    if (focused && root.contains(focused)) {
      focused.focus({preventScroll: true});
      if (selection) focused.setSelectionRange(...selection);
    }
  }

  function renderAdmin() {
    if (adminBody.dataset.authenticated === String(snapshot.is_admin)) return;
    adminBody.dataset.authenticated = String(snapshot.is_admin);
    adminBody.replaceChildren();
    if (snapshot.is_admin) {
      const label = element('label', 'comments-moderation'), input = element('input');
      input.type = 'checkbox';
      input.checked = snapshot.moderation;
      label.append(input, document.createTextNode('공개 전 관리자 승인'));
      input.addEventListener('change', () => {
        const desired = input.checked;
        action(input, async () => {
          try { const response = await request('/api/admin/settings', 'PUT', {moderation: desired, post_id: postId, request_id: crypto.randomUUID()}); update(response); }
          catch (error) { input.checked = !desired; throw error; }
        });
      });
      const logout = button('관리자 로그아웃', () => action(logout, async () => {
        await request('/api/admin/session', 'DELETE', {});
        identityEpoch++;
        await load();
        adminTitle.focus({preventScroll: true});
      }));
      adminBody.append(label, logout);
    } else {
      const form = element('form', 'comments-admin-login'), label = element('label', 'comments-field'), token = element('input');
      token.type = 'password'; token.autocomplete = 'current-password'; token.required = true;
      label.append(element('span', '', '관리자 인증 키'), token);
      const submit = element('button', 'comments-submit', '관리자 로그인');
      submit.type = 'submit';
      form.append(label, submit);
      form.addEventListener('submit', event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        action(submit, async () => {
          await request('/api/admin/login', 'POST', {token: token.value});
          identityEpoch++;
          token.value = '';
          await load();
          adminTitle.focus({preventScroll: true});
        });
      });
      adminBody.append(form);
    }
  }

  function render() {
    if (!snapshot) return;
    const visible = visibleSnapshot();
    previewNotice.hidden = !snapshot.preview;
    composer.submit.disabled = Boolean(composer.inFlight);
    updateIdentity(composer);
    if (activeEditor) { updateIdentity(activeEditor); activeEditor.submit.disabled = Boolean(activeEditor.inFlight); }
    count.textContent = visible.comments.filter(comment => comment.status !== 'deleted').length + '개 댓글';
    postLike.disabled = false;
    updateLike(postLike, null, visible.post_likes, visible.post_liked);
    renderList();
    renderAdmin();
    taskFailures.replaceChildren();
    for (const task of snapshot.tasks || []) {
      if (task.status !== 'failed' || !task.body || recoveredTasks.has(task.id)) continue;
      taskFailures.append(button('저장 실패한 댓글 내용 복원', () => {
        const comment = snapshot.comments.find(item => item.id === task.comment_id);
        if (task.kind === 'edit' && comment?.can_edit) {
          openEditor(comment, true);
          if (activeEditor?.target !== comment.id || activeEditor.inFlight) return;
          activeEditor.body.value = task.body;
        } else if (!composer.body.value || confirm('작성 중인 내용을 실패한 댓글로 바꿀까요?')) {
          composer.body.value = task.body;
          composer.requestId = null; composer.requestBody = null;
          composer.body.focus({preventScroll: true});
        } else return;
        recoveredTasks.add(task.id);
        render(); showTasks();
      }, 'comments-retry'));
    }
    const setting = adminBody.querySelector('input[type=checkbox]');
    if (setting) setting.checked = snapshot.moderation;
  }

  function update(result) {
    if (result.identityEpoch !== undefined && result.identityEpoch !== identityEpoch) { render(); return; }
    if (snapshot && Number(result.revision || 0) < Number(snapshot.revision || 0)) { render(); return; }
    if (!result.moderation) {
      for (const task of result.tasks || []) {
        if (task.kind === 'create' && task.status === 'done' && !publicationWaiting.has(task.id) && result.comments.some(comment => comment.id === task.comment_id && comment.status === 'pending')) {
          publicationWaiting.add(task.id);
          publicationPolls = 30;
        }
      }
    }
    if (!result.comments.some(comment => comment.status === 'pending') || result.moderation) publicationPolls = 0;
    snapshot = result;
    render();
    showTasks();
  }

  async function start() {
    if (typeof location !== 'undefined' && location.hostname === 'www.anyflow.net') {
      try { await fetch('https://anyflow.net/api/identity-migration', {credentials: 'include', signal: AbortSignal.timeout(3000)}); } catch {}
    }
    await load();
  }
  start();
})();
