# Project X — Roommate Bot MVP

[Русская версия](README_RU.md)

## Overview

Project X Roommate Bot is an MVP Telegram bot designed to help students find compatible roommates and housing options.

The project was created as an intermediate version of Project X — a student housing platform concept focused on making the roommate search process safer, simpler and more structured.

## My Role

In this project, I was responsible for:

- Product idea and MVP concept
- User flow design
- Telegram bot logic planning
- Roommate matching logic
- Product documentation
- Analytics metrics planning
- GitHub portfolio presentation

## Project Goal

The main objective of this MVP is to validate the core product hypothesis:

> Students need a simple and structured way to find compatible roommates before renting accommodation.

The MVP allows testing user behaviour, profile logic, moderation workflows and matching mechanics before developing a full platform.

## Problem

Students moving to a new city often face several challenges:

- Difficulty finding reliable roommates
- Lack of information about lifestyle habits and preferences
- Housing search scattered across multiple chats and social networks
- Safety concerns when contacting strangers
- No compatibility-based matching process

## Solution

The bot provides a structured Telegram-based workflow where users can:

- Create a profile
- Add personal preferences
- Upload photos
- Submit profiles for moderation
- Search for compatible roommates
- Receive matches based on selected criteria

## MVP Features

### User Features

- User registration
- Profile creation
- Profile editing
- Photo upload
- Roommate search
- Basic matching system
- Persistent menu navigation

### Admin Features

- Profile moderation
- Profile approval
- Rejection comments
- User management

### Database

- SQLite storage
- User profiles
- Matching data
- Moderation status

## Product Analytics

The project was designed with future analytics capabilities in mind.

Potential product metrics:

- Registered users
- Created profiles
- Profile completion rate
- Approval rate
- Match conversion rate
- Returning users
- Invite conversion rate
- User retention

## Tech Stack

### Backend

- JavaScript
- Cloudflare Workers

### Database

- SQLite
- SQL

### Platform

- Telegram Bot API
- Wrangler CLI

- ## Repository Structure

```text
Project-X-Roommate-Bot-MVP/
│
├── src/
│   └── bot.js
│
├── docs/
│   ├── product_description.md
│   ├── user_flow.md
│   └── roadmap.md
│
├── screenshots/
│   └── project screenshots
│
├── README.md
├── README_RU.md
├── ROADMAP.md
├── CHANGELOG.md
├── SECURITY_CHECK.md
├── package.json
└── .gitignore
```

## Future Development

Planned improvements:

- Advanced matching algorithm
- Mutual match confirmation
- Multi-language support
- Housing listings
- Analytics dashboard
- Admin panel
- User feedback system

## Status

Current stage: MVP / Work In Progress

[Русская версия](README_RU.md)
