//! LC-3 assembly language parser.
//!
//! Uses the `chumsky` parser combinator library to parse LC-3 assembly source

use chumsky::prelude::*;
use chumsky::recovery::via_parser;
use chumsky::span::SimpleSpan;
use std::ops::Range;

/// A source span (byte offset range).
pub type Span = Range<usize>;

/// A value with its source location.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Spanned<T> {
    pub value: T,
    pub span: Span,
}

impl<T> Spanned<T> {
    pub fn new(value: T, span: Span) -> Self {
        Self { value, span }
    }

    pub fn map<U>(self, f: impl FnOnce(T) -> U) -> Spanned<U> {
        Spanned {
            value: f(self.value),
            span: self.span,
        }
    }
}

impl<T> std::ops::Deref for Spanned<T> {
    type Target = T;
    fn deref(&self) -> &Self::Target {
        &self.value
    }
}

/// A register R0-R7.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Register(pub u8);

/// An operand in an instruction or directive.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Operand {
    Register(Register),
    Immediate(i16),
    Label(Spanned<String>),
    String(String),
}

/// Assembly directives.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Directive {
    Orig(u16),
    Fill(Operand),
    Blkw(u16),
    Stringz(String),
    End,
}

/// Second operand for ADD (register or 5-bit immediate).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AddSrc2 {
    Register(Register),
    Immediate(i8),
}

/// Second operand for AND (register or 5-bit immediate).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AndSrc2 {
    Register(Register),
    Immediate(i8),
}

/// LC-3 instructions.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Instruction {
    Add {
        dr: Register,
        sr1: Register,
        src2: AddSrc2,
    },
    And {
        dr: Register,
        sr1: Register,
        src2: AndSrc2,
    },
    Not {
        dr: Register,
        sr: Register,
    },
    Br {
        n: bool,
        z: bool,
        p: bool,
        label: Spanned<String>,
    },
    Jmp {
        base: Register,
    },
    Ret,
    Jsr {
        label: Spanned<String>,
    },
    Jsrr {
        base: Register,
    },
    Ld {
        dr: Register,
        label: Spanned<String>,
    },
    Ldi {
        dr: Register,
        label: Spanned<String>,
    },
    Ldr {
        dr: Register,
        base: Register,
        offset: i8,
    },
    Lea {
        dr: Register,
        label: Spanned<String>,
    },
    St {
        sr: Register,
        label: Spanned<String>,
    },
    Sti {
        sr: Register,
        label: Spanned<String>,
    },
    Str {
        sr: Register,
        base: Register,
        offset: i8,
    },
    Trap {
        trapvect: u8,
    },
    Getc,
    Out,
    Puts,
    In,
    Putsp,
    Halt,
    Rti,
}

/// A parsed line of assembly.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Line {
    Label(Spanned<String>),
    LabeledDirective(Spanned<String>, Directive),
    LabeledInstruction(Spanned<String>, Instruction),
    Directive(Directive),
    Instruction(Instruction),
    Empty,
    Error,
}

/// A parsed line with its source span.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SpannedLine {
    pub line: Line,
    pub span: Span,
}

/// A complete parsed program.
#[derive(Debug, Clone)]
pub struct Program {
    pub lines: Vec<SpannedLine>,
}

type ParserInput<'a> = &'a str;
type ParserExtra<'a> = extra::Err<Rich<'a, char>>;

// ============================================================================
// Primitive parsers
// ============================================================================

fn kw<'a>(keyword: &'a str) -> impl Parser<'a, ParserInput<'a>, &'a str, ParserExtra<'a>> + Clone {
    any()
        .filter(|c: &char| c.is_ascii_alphabetic() || *c == '_')
        .repeated()
        .at_least(1)
        .to_slice()
        .try_map(move |s: &str, span| {
            if s.eq_ignore_ascii_case(keyword) {
                Ok(s)
            } else {
                Err(Rich::custom(span, format!("expected '{keyword}'")))
            }
        })
}

fn ws<'a>() -> impl Parser<'a, ParserInput<'a>, (), ParserExtra<'a>> + Clone {
    one_of(" \t").repeated().ignored()
}

fn ws1<'a>() -> impl Parser<'a, ParserInput<'a>, (), ParserExtra<'a>> + Clone {
    one_of(" \t").repeated().at_least(1).ignored()
}

fn comma<'a>() -> impl Parser<'a, ParserInput<'a>, (), ParserExtra<'a>> + Clone {
    ws().then(just(',').or_not()).then(ws()).ignored()
}

fn register<'a>() -> impl Parser<'a, ParserInput<'a>, Register, ParserExtra<'a>> + Clone {
    just('R')
        .or(just('r'))
        .ignore_then(any().filter(|c: &char| c.is_ascii_digit()).to_slice())
        .validate(|s: &str, e, emitter| {
            let digit = s.chars().next().unwrap().to_digit(10).unwrap() as u8;
            if digit <= 7 {
                Register(digit)
            } else {
                emitter.emit(Rich::custom(
                    e.span(),
                    format!("R{digit} is not valid, use R0-R7"),
                ));
                Register(0)
            }
        })
        .labelled("register (R0-R7)")
}

fn hex_number<'a>() -> impl Parser<'a, ParserInput<'a>, u16, ParserExtra<'a>> + Clone {
    just('x')
        .or(just('X'))
        .ignore_then(
            any()
                .filter(|c: &char| c.is_ascii_hexdigit())
                .repeated()
                .at_least(1)
                .to_slice(),
        )
        .try_map(|s: &str, span| {
            u16::from_str_radix(s, 16).map_err(|_| Rich::custom(span, "invalid hex number"))
        })
}

fn decimal_number<'a>() -> impl Parser<'a, ParserInput<'a>, i16, ParserExtra<'a>> + Clone {
    just('#')
        .or_not()
        .ignore_then(
            just('-')
                .or_not()
                .then(
                    any()
                        .filter(|c: &char| c.is_ascii_digit())
                        .repeated()
                        .at_least(1),
                )
                .to_slice(),
        )
        .try_map(|s: &str, span| {
            s.parse::<i16>()
                .map_err(|_| Rich::custom(span, "invalid decimal number"))
        })
}

fn number<'a>() -> impl Parser<'a, ParserInput<'a>, i16, ParserExtra<'a>> + Clone {
    hex_number()
        .map(|n| n as i16)
        .or(decimal_number())
        .labelled("number")
}

fn identifier<'a>() -> impl Parser<'a, ParserInput<'a>, Spanned<String>, ParserExtra<'a>> + Clone {
    any()
        .filter(|c: &char| c.is_ascii_alphabetic() || *c == '_')
        .then(
            any()
                .filter(|c: &char| c.is_ascii_alphanumeric() || *c == '_')
                .repeated(),
        )
        .to_slice()
        .map_with(|s: &str, e| {
            let span: SimpleSpan = e.span();
            Spanned::new(s.to_uppercase(), span.into_range())
        })
        .labelled("label")
}

fn string_literal<'a>() -> impl Parser<'a, ParserInput<'a>, String, ParserExtra<'a>> + Clone {
    let escape = just('\\').ignore_then(choice((
        just('n').to('\n'),
        just('r').to('\r'),
        just('t').to('\t'),
        just('\\').to('\\'),
        just('"').to('"'),
        just('0').to('\0'),
    )));

    let regular_char = none_of("\\\"");

    just('"')
        .ignore_then(
            choice((escape, regular_char))
                .repeated()
                .collect::<String>(),
        )
        .then_ignore(just('"'))
        .labelled("string")
}

// ============================================================================
// Directives
// ============================================================================

fn directive<'a>() -> impl Parser<'a, ParserInput<'a>, Directive, ParserExtra<'a>> + Clone {
    let orig = kw("ORIG")
        .ignore_then(ws1())
        .ignore_then(hex_number().or(decimal_number().map(|n| n as u16)))
        .map(Directive::Orig);

    let fill = kw("FILL")
        .ignore_then(ws1())
        .ignore_then(choice((
            hex_number().map(|n| Operand::Immediate(n as i16)),
            decimal_number().map(Operand::Immediate),
            identifier().map(Operand::Label),
        )))
        .map(Directive::Fill);

    let blkw = kw("BLKW")
        .ignore_then(ws1())
        .ignore_then(hex_number().or(decimal_number().map(|n| n as u16)))
        .map(Directive::Blkw);

    let stringz = kw("STRINGZ")
        .ignore_then(ws1())
        .ignore_then(string_literal())
        .map(Directive::Stringz);

    let end = kw("END").to(Directive::End);

    just('.')
        .ignore_then(choice((orig, fill, blkw, stringz, end)))
        .labelled("directive")
}

// ============================================================================
// Instructions
// ============================================================================

fn instr_add<'a>() -> impl Parser<'a, ParserInput<'a>, Instruction, ParserExtra<'a>> + Clone {
    kw("ADD")
        .ignore_then(ws1())
        .ignore_then(register())
        .then_ignore(comma())
        .then(register())
        .then_ignore(comma())
        .then(choice((
            register().map(AddSrc2::Register),
            number().map(|n| AddSrc2::Immediate(n as i8)),
        )))
        .map(|((dr, sr1), src2)| Instruction::Add { dr, sr1, src2 })
}

fn instr_and<'a>() -> impl Parser<'a, ParserInput<'a>, Instruction, ParserExtra<'a>> + Clone {
    kw("AND")
        .ignore_then(ws1())
        .ignore_then(register())
        .then_ignore(comma())
        .then(register())
        .then_ignore(comma())
        .then(choice((
            register().map(AndSrc2::Register),
            number().map(|n| AndSrc2::Immediate(n as i8)),
        )))
        .map(|((dr, sr1), src2)| Instruction::And { dr, sr1, src2 })
}

fn instr_not<'a>() -> impl Parser<'a, ParserInput<'a>, Instruction, ParserExtra<'a>> + Clone {
    kw("NOT")
        .ignore_then(ws1())
        .ignore_then(register())
        .then_ignore(comma())
        .then(register())
        .map(|(dr, sr)| Instruction::Not { dr, sr })
}

fn branch_condition<'a>()
-> impl Parser<'a, ParserInput<'a>, (bool, bool, bool), ParserExtra<'a>> + Clone {
    any()
        .filter(|c: &char| c.is_ascii_alphabetic())
        .repeated()
        .at_least(2)
        .to_slice()
        .try_map(|s: &str, span| {
            let upper = s.to_ascii_uppercase();
            if !upper.starts_with("BR") {
                return Err(Rich::custom(span, "expected branch instruction"));
            }
            let flags = &upper[2..];
            if !flags.chars().all(|c| matches!(c, 'N' | 'Z' | 'P')) {
                return Err(Rich::custom(span, "invalid branch flags"));
            }
            let n = flags.contains('N') || flags.is_empty();
            let z = flags.contains('Z') || flags.is_empty();
            let p = flags.contains('P') || flags.is_empty();
            Ok((n, z, p))
        })
}

fn instr_br<'a>() -> impl Parser<'a, ParserInput<'a>, Instruction, ParserExtra<'a>> + Clone {
    branch_condition()
        .then_ignore(ws1())
        .then(identifier())
        .map(|((n, z, p), label)| Instruction::Br { n, z, p, label })
}

macro_rules! simple_instr {
    ($name:ident, $kw:literal, $variant:ident) => {
        fn $name<'a>() -> impl Parser<'a, ParserInput<'a>, Instruction, ParserExtra<'a>> + Clone {
            kw($kw).to(Instruction::$variant)
        }
    };
}

macro_rules! reg_instr {
    ($name:ident, $kw:literal, $variant:ident, $field:ident) => {
        fn $name<'a>() -> impl Parser<'a, ParserInput<'a>, Instruction, ParserExtra<'a>> + Clone {
            kw($kw)
                .ignore_then(ws1())
                .ignore_then(register())
                .map(|$field| Instruction::$variant { $field })
        }
    };
}

macro_rules! label_instr {
    ($name:ident, $kw:literal, $variant:ident, $field:ident) => {
        fn $name<'a>() -> impl Parser<'a, ParserInput<'a>, Instruction, ParserExtra<'a>> + Clone {
            kw($kw)
                .ignore_then(ws1())
                .ignore_then(identifier())
                .map(|$field| Instruction::$variant { $field })
        }
    };
}

macro_rules! reg_label_instr {
    ($name:ident, $kw:literal, $variant:ident, $reg:ident) => {
        fn $name<'a>() -> impl Parser<'a, ParserInput<'a>, Instruction, ParserExtra<'a>> + Clone {
            kw($kw)
                .ignore_then(ws1())
                .ignore_then(register())
                .then_ignore(comma())
                .then(identifier())
                .map(|($reg, label)| Instruction::$variant { $reg, label })
        }
    };
}

macro_rules! reg_base_offset_instr {
    ($name:ident, $kw:literal, $variant:ident, $reg:ident) => {
        fn $name<'a>() -> impl Parser<'a, ParserInput<'a>, Instruction, ParserExtra<'a>> + Clone {
            kw($kw)
                .ignore_then(ws1())
                .ignore_then(register())
                .then_ignore(comma())
                .then(register())
                .then_ignore(comma())
                .then(number())
                .map(|(($reg, base), offset)| Instruction::$variant {
                    $reg,
                    base,
                    offset: offset as i8,
                })
        }
    };
}

simple_instr!(instr_ret, "RET", Ret);
simple_instr!(instr_getc, "GETC", Getc);
simple_instr!(instr_out, "OUT", Out);
simple_instr!(instr_puts, "PUTS", Puts);
simple_instr!(instr_in, "IN", In);
simple_instr!(instr_putsp, "PUTSP", Putsp);
simple_instr!(instr_halt, "HALT", Halt);
simple_instr!(instr_rti, "RTI", Rti);

reg_instr!(instr_jmp, "JMP", Jmp, base);
reg_instr!(instr_jsrr, "JSRR", Jsrr, base);

label_instr!(instr_jsr, "JSR", Jsr, label);

reg_label_instr!(instr_ld, "LD", Ld, dr);
reg_label_instr!(instr_ldi, "LDI", Ldi, dr);
reg_label_instr!(instr_lea, "LEA", Lea, dr);
reg_label_instr!(instr_st, "ST", St, sr);
reg_label_instr!(instr_sti, "STI", Sti, sr);

reg_base_offset_instr!(instr_ldr, "LDR", Ldr, dr);
reg_base_offset_instr!(instr_str, "STR", Str, sr);

fn instr_trap<'a>() -> impl Parser<'a, ParserInput<'a>, Instruction, ParserExtra<'a>> + Clone {
    kw("TRAP")
        .ignore_then(ws1())
        .ignore_then(hex_number().or(decimal_number().map(|n| n as u16)))
        .map(|trapvect| Instruction::Trap {
            trapvect: trapvect as u8,
        })
}

fn instruction<'a>() -> impl Parser<'a, ParserInput<'a>, Instruction, ParserExtra<'a>> + Clone {
    choice((
        instr_add(),
        instr_and(),
        instr_not(),
        instr_br(),
        instr_jmp(),
        instr_ret(),
        instr_jsrr(),
        instr_jsr(),
        instr_ldi(),
        instr_ldr(),
        instr_ld(),
        instr_lea(),
        instr_sti(),
        instr_str(),
        instr_st(),
        instr_trap(),
        instr_getc(),
        instr_out(),
        instr_puts(),
        instr_in(),
        instr_putsp(),
        instr_halt(),
        instr_rti(),
    ))
    .labelled("instruction")
}

// ============================================================================
// Line parsing
// ============================================================================

fn comment<'a>() -> impl Parser<'a, ParserInput<'a>, (), ParserExtra<'a>> + Clone {
    just(';')
        .then(any().and_is(just('\n').not()).repeated())
        .ignored()
}

const RESERVED: &[&str] = &[
    "ADD", "AND", "NOT", "BR", "BRN", "BRZ", "BRP", "BRNZ", "BRNP", "BRZP", "BRNZP", "JMP", "RET",
    "JSR", "JSRR", "LD", "LDI", "LDR", "LEA", "ST", "STI", "STR", "TRAP", "RTI", "GETC", "OUT",
    "PUTS", "IN", "PUTSP", "HALT",
];

fn is_reserved(name: &str) -> bool {
    RESERVED.contains(&name)
}

fn label_with_colon<'a>()
-> impl Parser<'a, ParserInput<'a>, Spanned<String>, ParserExtra<'a>> + Clone {
    identifier().then_ignore(just(':'))
}

fn label_without_colon<'a>()
-> impl Parser<'a, ParserInput<'a>, Spanned<String>, ParserExtra<'a>> + Clone {
    identifier().try_map(|spanned: Spanned<String>, span| {
        if is_reserved(&spanned.value) {
            Err(Rich::custom(
                span,
                format!("'{}' is a reserved keyword", spanned.value),
            ))
        } else {
            Ok(spanned)
        }
    })
}

fn line<'a>() -> impl Parser<'a, ParserInput<'a>, SpannedLine, ParserExtra<'a>> + Clone {
    let labeled_colon_dir = label_with_colon()
        .then_ignore(ws())
        .then(directive())
        .map(|(l, d)| Line::LabeledDirective(l, d));
    let labeled_colon_instr = label_with_colon()
        .then_ignore(ws())
        .then(instruction())
        .map(|(l, i)| Line::LabeledInstruction(l, i));
    let label_colon_only = label_with_colon().map(Line::Label);

    let labeled_space_dir = label_without_colon()
        .then_ignore(ws1())
        .then(directive())
        .map(|(l, d)| Line::LabeledDirective(l, d));
    let labeled_space_instr = label_without_colon()
        .then_ignore(ws1())
        .then(instruction())
        .map(|(l, i)| Line::LabeledInstruction(l, i));

    let directive_only = directive().map(Line::Directive);
    let instruction_only = instruction().map(Line::Instruction);
    let label_only = label_without_colon().map(Line::Label);
    let empty = empty().to(Line::Empty);

    let eol = ws().then(comment().or_not()).ignored();
    let skip_to_eol = any().and_is(just('\n').not()).repeated().ignored();
    let recovery = any().and_is(just('\n').not()).repeated().to(Line::Error);

    ws().ignore_then(choice((
        labeled_colon_dir,
        labeled_colon_instr,
        label_colon_only,
        labeled_space_dir,
        labeled_space_instr,
        directive_only,
        instruction_only,
        label_only,
        empty,
    )))
    .map_with(|line, e| {
        let span: SimpleSpan = e.span();
        SpannedLine {
            line,
            span: span.into_range(),
        }
    })
    .then_ignore(eol.recover_with(via_parser(skip_to_eol)))
    .recover_with(via_parser(recovery.map_with(|line, e| {
        let span: SimpleSpan = e.span();
        SpannedLine {
            line,
            span: span.into_range(),
        }
    })))
}

fn program<'a>() -> impl Parser<'a, ParserInput<'a>, Program, ParserExtra<'a>> {
    line()
        .separated_by(just('\n'))
        .allow_trailing()
        .collect()
        .map(|lines: Vec<SpannedLine>| Program { lines })
}

// ============================================================================
// Public API
// ============================================================================

/// A parse error with location information.
#[derive(Debug, Clone)]
pub struct ParseError {
    pub message: String,
    pub line: usize,
    pub column: usize,
    pub span: std::ops::Range<usize>,
}

impl std::fmt::Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}:{}: {}", self.line, self.column, self.message)
    }
}

/// Parse LC-3 assembly source code.
pub fn parse(source: &str) -> Result<Program, Vec<ParseError>> {
    match program().parse(source).into_result() {
        Ok(p) => Ok(p),
        Err(errors) => Err(errors
            .into_iter()
            .map(|e| to_parse_error(source, e))
            .collect()),
    }
}

fn to_parse_error(source: &str, e: Rich<'_, char>) -> ParseError {
    let span = e.span();
    let (line, column) = offset_to_pos(source, span.start);

    let message = match e.reason() {
        chumsky::error::RichReason::Custom(msg) => msg.to_string(),
        _ => {
            let mut msg = match e.found() {
                Some(c) => format!("unexpected {}", format_char(*c)),
                None => "unexpected end of input".into(),
            };

            let expected: Vec<_> = e
                .expected()
                .filter_map(format_expected)
                .collect::<std::collections::HashSet<_>>()
                .into_iter()
                .collect();

            let simplified = simplify_expected(expected);
            if !simplified.is_empty() {
                if simplified.len() == 1 {
                    msg.push_str(&format!(", expected {}", simplified[0]));
                } else {
                    msg.push_str(&format!(
                        ", expected {} or {}",
                        simplified[..simplified.len() - 1].join(", "),
                        simplified.last().unwrap()
                    ));
                }
            }
            msg
        }
    };

    ParseError {
        message,
        line,
        column,
        span: span.start..span.end,
    }
}

fn offset_to_pos(source: &str, offset: usize) -> (usize, usize) {
    let mut line = 1;
    let mut col = 1;
    for (i, c) in source.chars().enumerate() {
        if i >= offset {
            break;
        }
        if c == '\n' {
            line += 1;
            col = 1;
        } else {
            col += 1;
        }
    }
    (line, col)
}

fn format_char(c: char) -> String {
    match c {
        ' ' => "space".into(),
        '\t' => "tab".into(),
        '\n' => "newline".into(),
        '\r' => "carriage return".into(),
        c if c.is_ascii_control() => format!("control char {:?}", c),
        c => format!("'{c}'"),
    }
}

fn format_expected(expected: &chumsky::error::RichPattern<'_, char>) -> Option<String> {
    use chumsky::error::RichPattern;
    use chumsky::util::Maybe;
    match expected {
        RichPattern::Token(c) => Some(format_char(match c {
            Maybe::Val(c) => *c,
            Maybe::Ref(c) => **c,
        })),
        RichPattern::Label(l) => Some(l.to_string()),
        RichPattern::EndOfInput => Some("end of input".into()),
        RichPattern::Identifier(id) => Some(id.to_string()),
        RichPattern::Any => Some("any character".into()),
        RichPattern::SomethingElse => None,
        _ => None,
    }
}

fn simplify_expected(mut expected: Vec<String>) -> Vec<String> {
    let low_level = [
        "end of input",
        "any character",
        "space",
        "tab",
        "newline",
        "carriage return",
    ];

    let labels: Vec<_> = expected
        .iter()
        .filter(|s| {
            (s.contains(' ') && !low_level.contains(&s.as_str()))
                || s.starts_with("register")
                || s.starts_with("label")
        })
        .cloned()
        .collect();

    if !labels.is_empty() {
        return labels;
    }

    let has = |s: &str| expected.iter().any(|x| x == s);
    if [
        has("newline"),
        has("space"),
        has("tab"),
        has("';'"),
        has("end of input"),
    ]
    .iter()
    .filter(|&&x| x)
    .count()
        >= 3
    {
        return vec!["end of line or comment".into()];
    }

    if expected.len() == 1 && has("end of input") {
        return vec!["end of line or comment".into()];
    }

    expected.retain(|s| !["space", "tab", "newline"].contains(&s.as_str()));
    expected
}

/// Format parse errors with source context for pretty display.
pub fn format_errors(filename: &str, source: &str, errors: &[ParseError]) -> String {
    use ariadne::{Color, Label, Report, ReportKind, Source};

    let mut output = Vec::new();
    for error in errors {
        Report::<(&str, std::ops::Range<usize>)>::build(
            ReportKind::Error,
            (filename, error.span.clone()),
        )
        .with_message(&error.message)
        .with_label(
            Label::new((filename, error.span.clone()))
                .with_message(&error.message)
                .with_color(Color::Red),
        )
        .finish()
        .write((filename, Source::from(source)), &mut output)
        .unwrap();
    }
    String::from_utf8(output).unwrap_or_else(|_| "error formatting output".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_register() {
        assert_eq!(register().parse("R0").into_result(), Ok(Register(0)));
        assert_eq!(register().parse("R7").into_result(), Ok(Register(7)));
    }

    #[test]
    fn test_hex() {
        assert_eq!(hex_number().parse("x3000").into_result(), Ok(0x3000));
    }

    #[test]
    fn test_decimal() {
        assert_eq!(decimal_number().parse("#-5").into_result(), Ok(-5));
    }

    #[test]
    fn test_add() {
        assert!(instr_add().parse("ADD R0, R1, R2").into_result().is_ok());
        assert!(instr_add().parse("ADD R0, R1, #5").into_result().is_ok());
    }

    #[test]
    fn test_directive() {
        assert_eq!(
            directive().parse(".ORIG x3000").into_result(),
            Ok(Directive::Orig(0x3000))
        );
        assert_eq!(directive().parse(".END").into_result(), Ok(Directive::End));
    }

    #[test]
    fn test_program() {
        let source = ".ORIG x3000\nADD R0, R1, R2\nHALT\n.END";
        assert!(parse(source).is_ok());
    }
}
