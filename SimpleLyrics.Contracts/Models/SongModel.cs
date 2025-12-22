using System;
using System.Collections.Generic;
using System.Text;

namespace SimpleLyrics.Contracts.Models;

/// ==============================================================================================================================
/// <summary>
/// Represents a complete song with all its details including lyrics.
/// </summary>
/// ==============================================================================================================================
public class SongModel
{
	/// ==============================================================================================================================
	/// <summary>
	/// Gets or sets the unique identifier of the song.
	/// </summary>
	/// <value>The song identifier.</value>
	/// ==============================================================================================================================
	public int Id { get; set; }

	/// ==============================================================================================================================
	/// <summary>
	/// Gets or sets the title of the song.
	/// </summary>
	/// <value>The song title.</value>
	/// ==============================================================================================================================
	public string Title { get; set; } = null!;

	/// ==============================================================================================================================
	/// <summary>
	/// Gets or sets the interpreter or artist of the song.
	/// </summary>
	/// <value>The interpreter name, or <see langword="null"/> if not specified.</value>
	/// ==============================================================================================================================
	public string? Interpreter { get; set; }

	/// ==============================================================================================================================
	/// <summary>
	/// Gets or sets the category or genre of the song.
	/// </summary>
	/// <value>The song category, or <see langword="null"/> if not specified.</value>
	/// ==============================================================================================================================
	public string? Category { get; set; }

	/// ==============================================================================================================================
	/// <summary>
	/// Gets or sets the capo position for guitar playing.
	/// </summary>
	/// <value>The capo position. The default is 0.</value>
	/// ==============================================================================================================================
	public int Capo { get; set; }

	/// ==============================================================================================================================
	/// <summary>
	/// Gets or sets the lyrics text of the song.
	/// </summary>
	/// <value>The song lyrics, or <see langword="null"/> if not specified.</value>
	/// ==============================================================================================================================
	public string? Text { get; set; }
}
